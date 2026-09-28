#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderValue, Method, Request, StatusCode, Uri, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{delete, get, patch, post},
};
use fs2::FileExt;
use pong_core::{
    Canvas, CanvasEdge, CanvasNode, CanvasPort, CanvasRevision, Notification, PortDirection,
    PortKind, Run, RunStatus, RuntimeValue, Workspace,
};
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    env,
    fs::{File, OpenOptions, read_dir},
    io::{self, Read, Write},
    path::{Path as FsPath, PathBuf},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use subtle::ConstantTimeEq;
use tower_http::cors::CorsLayer;
use uuid::Uuid;

const HOST_AUTHORITY: &str = "127.0.0.1:4317";
const HOST_BIND_ADDRESS: &str = "127.0.0.1:4317";
const HOST_READY_LINE: &str = "pong-host listening on http://127.0.0.1:4317";
const PARENT_WATCH_MODE: &str = "stdin-eof";
const STARTUP_RETRY_ATTEMPTS: usize = 40;
const STARTUP_RETRY_DELAY: Duration = Duration::from_millis(50);
const CURRENT_DATABASE_VERSION: i64 = 1;
const DATABASE_BUSY_TIMEOUT: Duration = Duration::from_secs(5);
const HOST_TABLES: [&str; 3] = ["host_state", "command_journal", "host_events"];

struct InstanceLock {
    file: File,
}

impl InstanceLock {
    fn acquire(database_path: &PathBuf) -> io::Result<Self> {
        let path = database_path.with_extension("lock");
        let file = OpenOptions::new().create(true).write(true).open(&path)?;
        file.try_lock_exclusive().map_err(|error| {
            if error.kind() == io::ErrorKind::WouldBlock {
                io::Error::new(
                    io::ErrorKind::AlreadyExists,
                    format!("Host instance lock is already held: {}", path.display()),
                )
            } else {
                error
            }
        })?;
        Ok(Self { file })
    }
}

impl Drop for InstanceLock {
    fn drop(&mut self) {
        let _ = self.file.sync_all();
        let _ = self.file.unlock();
    }
}

fn parse_parent_watch(value: Option<&str>) -> Result<bool, &'static str> {
    match value {
        None => Ok(false),
        Some(PARENT_WATCH_MODE) => Ok(true),
        Some(_) => Err("PONG_HOST_PARENT_WATCH must be stdin-eof when configured"),
    }
}

fn start_parent_watch(enabled: bool) {
    if !enabled {
        return;
    }
    thread::spawn(|| {
        let mut stdin = io::stdin().lock();
        let mut buffer = [0_u8; 64];
        loop {
            match stdin.read(&mut buffer) {
                Ok(0) | Err(_) => std::process::exit(0),
                Ok(_) => {}
            }
        }
    });
}

async fn acquire_instance_lock(
    database_path: &PathBuf,
    retry_startup: bool,
) -> io::Result<InstanceLock> {
    let attempts = if retry_startup {
        STARTUP_RETRY_ATTEMPTS
    } else {
        1
    };
    for attempt in 0..attempts {
        match InstanceLock::acquire(database_path) {
            Ok(lock) => return Ok(lock),
            Err(error)
                if error.kind() == io::ErrorKind::AlreadyExists && attempt + 1 < attempts =>
            {
                tokio::time::sleep(STARTUP_RETRY_DELAY).await;
            }
            Err(error) => return Err(error),
        }
    }
    unreachable!("startup lock attempts always return or retry")
}

async fn bind_host_listener(retry_startup: bool) -> io::Result<tokio::net::TcpListener> {
    let attempts = if retry_startup {
        STARTUP_RETRY_ATTEMPTS
    } else {
        1
    };
    for attempt in 0..attempts {
        match tokio::net::TcpListener::bind(HOST_BIND_ADDRESS).await {
            Ok(listener) => return Ok(listener),
            Err(error) if error.kind() == io::ErrorKind::AddrInUse && attempt + 1 < attempts => {
                tokio::time::sleep(STARTUP_RETRY_DELAY).await;
            }
            Err(error) => return Err(error),
        }
    }
    unreachable!("startup bind attempts always return or retry")
}

#[derive(Clone)]
struct SecurityConfig {
    token: Arc<str>,
    allowed_origin: HeaderValue,
}

impl SecurityConfig {
    fn new(token: String, origin: &str) -> Result<Self, &'static str> {
        if !(32..=256).contains(&token.len())
            || !token.bytes().all(|byte| byte.is_ascii_alphanumeric())
        {
            return Err("PONG_HOST_TOKEN must be 32-256 ASCII letters or digits");
        }
        let uri: Uri = origin
            .parse()
            .map_err(|_| "Invalid PONG_HOST_ALLOWED_ORIGIN")?;
        let is_loopback_origin = uri.scheme_str() == Some("http")
            && uri.host() == Some("127.0.0.1")
            && uri.port_u16().is_some()
            && origin == format!("http://127.0.0.1:{}", uri.port_u16().unwrap());
        let is_tauri_desktop_origin = origin == "http://tauri.localhost";
        if !is_loopback_origin && !is_tauri_desktop_origin {
            return Err(
                "PONG_HOST_ALLOWED_ORIGIN must be http://tauri.localhost or an exact http://127.0.0.1:<port> origin",
            );
        }
        let allowed_origin =
            HeaderValue::from_str(origin).map_err(|_| "Invalid PONG_HOST_ALLOWED_ORIGIN")?;
        Ok(Self {
            token: token.into(),
            allowed_origin,
        })
    }

    fn from_env() -> Result<Self, &'static str> {
        let token = env::var("PONG_HOST_TOKEN").map_err(|_| "PONG_HOST_TOKEN is required")?;
        let origin = env::var("PONG_HOST_ALLOWED_ORIGIN")
            .map_err(|_| "PONG_HOST_ALLOWED_ORIGIN is required")?;
        Self::new(token, &origin)
    }
}

async fn authenticate(
    State(security): State<SecurityConfig>,
    request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    let headers = request.headers();
    if headers.get_all(header::HOST).iter().count() != 1
        || headers
            .get(header::HOST)
            .is_none_or(|host| host != HOST_AUTHORITY)
    {
        return HostError::new(
            StatusCode::FORBIDDEN,
            "HOST_FORBIDDEN",
            "Invalid Host authority",
            false,
        )
        .into_response();
    }
    if headers.get_all(header::ORIGIN).iter().count() > 1
        || headers
            .get(header::ORIGIN)
            .is_some_and(|origin| origin != security.allowed_origin)
    {
        return HostError::new(
            StatusCode::FORBIDDEN,
            "ORIGIN_FORBIDDEN",
            "Origin is not allowed",
            false,
        )
        .into_response();
    }
    let authorized = headers.get_all(header::AUTHORIZATION).iter().count() == 1
        && headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .is_some_and(|token| bool::from(token.as_bytes().ct_eq(security.token.as_bytes())));
    if !authorized {
        return HostError::new(
            StatusCode::UNAUTHORIZED,
            "AUTH_REQUIRED",
            "Host authentication is required",
            false,
        )
        .into_response();
    }
    next.run(request).await
}

#[derive(Clone)]
struct AppState {
    inner: Arc<Mutex<Store>>,
    db: Arc<Mutex<Connection>>,
    snapshot_version: Arc<Mutex<u64>>,
}

#[derive(Default, Clone)]
struct Store {
    workspaces: HashMap<Uuid, Workspace>,
    canvases: HashMap<Uuid, Canvas>,
    nodes: HashMap<Uuid, CanvasNode>,
    edges: HashMap<Uuid, CanvasEdge>,
    revisions: HashMap<Uuid, CanvasRevision>,
    runs: HashMap<Uuid, Run>,
    notifications: HashMap<Uuid, Notification>,
    run_idempotency: HashMap<(Uuid, String), Uuid>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateWorkspace {
    name: String,
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCanvas {
    workspace_id: Uuid,
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateNodeInput {
    name: String,
    kind: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateEdgeInput {
    source_node_id: Uuid,
    source_port_id: Uuid,
    target_node_id: Uuid,
    target_port_id: Uuid,
    kind: PortKind,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreatePortInput {
    name: String,
    direction: PortDirection,
    kind: PortKind,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpdateNodeInput {
    name: Option<String>,
    config: Option<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Deserialize)]
struct RenameInput {
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntrypointInput {
    node_id: Uuid,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StartRunInput {
    revision: u64,
    #[serde(default)]
    entrypoint: Option<String>,
    #[serde(default)]
    entrypoint_id: Option<String>,
    idempotency_key: String,
}

fn normalize_start_entrypoint(canvas_id: Uuid, input: &StartRunInput) -> Result<String, HostError> {
    let legacy_default = input.entrypoint.as_deref();
    if let Some(entrypoint) = legacy_default {
        if entrypoint != "default" {
            return Err(HostError::new(
                StatusCode::UNPROCESSABLE_ENTITY,
                "INVALID_INPUT",
                "Only the default manual entrypoint is supported by this Host",
                false,
            ));
        }
    }

    if let Some(entrypoint_id) = input.entrypoint_id.as_deref() {
        let expected = format!("{canvas_id}:default");
        if entrypoint_id != expected {
            return Err(HostError::new(
                StatusCode::UNPROCESSABLE_ENTITY,
                "INVALID_INPUT",
                "Only the default manual entrypoint is supported by this Host",
                false,
            ));
        }
    }

    if legacy_default.is_none() && input.entrypoint_id.is_none() {
        return Err(HostError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "INVALID_INPUT",
            "entrypointId or legacy entrypoint is required",
            false,
        ));
    }

    Ok("default".to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SubmitRunInput {
    value: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SaveRevisionInput {
    #[serde(default)]
    expected_draft_revision: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HostErrorBody {
    code: &'static str,
    message: &'static str,
    retryable: bool,
}

struct HostError {
    status: StatusCode,
    body: HostErrorBody,
}

impl HostError {
    fn new(status: StatusCode, code: &'static str, message: &'static str, retryable: bool) -> Self {
        Self {
            status,
            body: HostErrorBody {
                code,
                message,
                retryable,
            },
        }
    }
}

fn persistence_error(error: rusqlite::Error) -> HostError {
    eprintln!("pong-host persistence failure: {error}");
    HostError::new(
        StatusCode::SERVICE_UNAVAILABLE,
        "PERSISTENCE_FAILED",
        "The local Host could not persist the change. Retry the command.",
        true,
    )
}

fn not_found_error(resource: &'static str) -> HostError {
    HostError::new(StatusCode::NOT_FOUND, "NOT_FOUND", resource, false)
}

fn invalid_input_error(message: &'static str) -> HostError {
    HostError::new(
        StatusCode::UNPROCESSABLE_ENTITY,
        "INVALID_INPUT",
        message,
        false,
    )
}

fn persist_candidate(
    state: &AppState,
    store: &mut Store,
    previous: Store,
) -> Result<(), HostError> {
    if let Err(error) = state.persist(store) {
        *store = previous;
        return Err(persistence_error(error));
    }
    Ok(())
}

impl IntoResponse for HostError {
    fn into_response(self) -> Response {
        let mut response = (self.status, Json(self.body)).into_response();
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            header::HeaderValue::from_static("application/json"),
        );
        response
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    #[serde(default)]
    snapshot_version: u64,
    workspaces: Vec<Workspace>,
    canvases: Vec<Canvas>,
    nodes: Vec<CanvasNode>,
    #[serde(default)]
    edges: Vec<CanvasEdge>,
    revisions: Vec<CanvasRevision>,
    runs: Vec<Run>,
    notifications: Vec<Notification>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HostEvent {
    event_id: Uuid,
    event_type: &'static str,
    global_position: u64,
    snapshot_version: u64,
    occurred_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventQuery {
    #[serde(default)]
    after_global_position: u64,
    #[serde(default = "default_event_limit")]
    limit: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct EventBatch {
    events: Vec<HostEvent>,
    next_global_position: u64,
    snapshot_version: u64,
}

fn default_event_limit() -> u64 {
    100
}

fn invalid_persisted_state(message: impl Into<String>) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            message.into(),
        )),
    )
}

fn database_object_exists(
    connection: &Connection,
    object_type: &str,
    object_name: &str,
) -> rusqlite::Result<bool> {
    connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = ?1 AND name = ?2)",
        params![object_type, object_name],
        |row| row.get(0),
    )
}

fn table_sql_contains(
    connection: &Connection,
    table: &str,
    fragment: &str,
) -> rusqlite::Result<bool> {
    let sql: Option<String> = connection
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [table],
            |row| row.get(0),
        )
        .optional()?;
    Ok(sql.is_some_and(|sql| {
        sql.to_ascii_lowercase()
            .contains(&fragment.to_ascii_lowercase())
    }))
}

fn verify_database_schema(connection: &Connection) -> rusqlite::Result<()> {
    for table in HOST_TABLES {
        if !database_object_exists(connection, "table", table)? {
            return Err(invalid_persisted_state(format!(
                "Database schema is missing required table {table}"
            )));
        }
    }
    if !database_object_exists(connection, "index", "idx_host_events_snapshot_version")? {
        return Err(invalid_persisted_state(
            "Database schema is missing index idx_host_events_snapshot_version",
        ));
    }
    if !table_sql_contains(
        connection,
        "command_journal",
        "check (length(trim(idempotency_key)) > 0)",
    )? || !table_sql_contains(connection, "command_journal", "check (revision >= 0)")?
        || !table_sql_contains(
            connection,
            "command_journal",
            "check (entrypoint = 'default')",
        )?
    {
        return Err(invalid_persisted_state(
            "Database schema is missing command_journal integrity constraints",
        ));
    }
    if !table_sql_contains(connection, "host_events", "check (global_position > 0)")?
        || !table_sql_contains(
            connection,
            "host_events",
            "check (snapshot_version = global_position)",
        )?
        || !table_sql_contains(
            connection,
            "host_events",
            "check (event_type = 'projection.snapshot.updated')",
        )?
    {
        return Err(invalid_persisted_state(
            "Database schema is missing host_events integrity constraints",
        ));
    }
    Ok(())
}

fn rebuild_command_journal(transaction: &rusqlite::Transaction<'_>) -> rusqlite::Result<()> {
    transaction.execute_batch(
        "ALTER TABLE command_journal RENAME TO command_journal_legacy;
         CREATE TABLE command_journal (
           canvas_id TEXT NOT NULL,
           idempotency_key TEXT NOT NULL,
           run_id TEXT NOT NULL,
           revision INTEGER NOT NULL,
           entrypoint TEXT NOT NULL,
           PRIMARY KEY (canvas_id, idempotency_key),
           CHECK (length(trim(idempotency_key)) > 0),
           CHECK (revision >= 0),
           CHECK (entrypoint = 'default')
         );
         INSERT INTO command_journal (canvas_id, idempotency_key, run_id, revision, entrypoint)
           SELECT canvas_id, idempotency_key, run_id, revision, entrypoint
           FROM command_journal_legacy;
         DROP TABLE command_journal_legacy;",
    )
}

fn rebuild_host_events(transaction: &rusqlite::Transaction<'_>) -> rusqlite::Result<()> {
    transaction.execute_batch(
        "ALTER TABLE host_events RENAME TO host_events_legacy;
         CREATE TABLE host_events (
           global_position INTEGER PRIMARY KEY,
           event_id TEXT NOT NULL UNIQUE,
           event_type TEXT NOT NULL,
           snapshot_version INTEGER NOT NULL,
           occurred_at TEXT NOT NULL,
           CHECK (global_position > 0),
           CHECK (snapshot_version = global_position),
           CHECK (event_type = 'projection.snapshot.updated')
         );
         INSERT INTO host_events (global_position, event_id, event_type, snapshot_version, occurred_at)
           SELECT global_position, event_id, event_type, snapshot_version, occurred_at
           FROM host_events_legacy;
         DROP TABLE host_events_legacy;
         CREATE INDEX idx_host_events_snapshot_version
           ON host_events(snapshot_version);",
    )
}

impl From<Snapshot> for Store {
    fn from(snapshot: Snapshot) -> Self {
        let nodes = snapshot
            .nodes
            .into_iter()
            .map(|item| (item.id, item))
            .collect::<HashMap<_, _>>();
        let runs = snapshot
            .runs
            .into_iter()
            .map(|mut run| {
                if !run.node_values.is_empty() {
                    for (node_id, value) in std::mem::take(&mut run.node_values) {
                        let Some(port_id) =
                            nodes.get(&node_id).and_then(primary_value_output_port_id)
                        else {
                            continue;
                        };
                        run.port_values
                            .entry(port_id)
                            .or_insert_with(|| RuntimeValue::text(value));
                    }
                }
                (run.id, run)
            })
            .collect();
        Self {
            workspaces: snapshot
                .workspaces
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
            canvases: snapshot
                .canvases
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
            nodes,
            edges: snapshot
                .edges
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
            revisions: snapshot
                .revisions
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
            runs,
            notifications: snapshot
                .notifications
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
            run_idempotency: HashMap::new(),
        }
    }
}

impl From<&Store> for Snapshot {
    fn from(store: &Store) -> Self {
        Self {
            snapshot_version: 0,
            workspaces: store.workspaces.values().cloned().collect(),
            canvases: store.canvases.values().cloned().collect(),
            nodes: store.nodes.values().cloned().collect(),
            edges: store.edges.values().cloned().collect(),
            revisions: store.revisions.values().cloned().collect(),
            runs: store.runs.values().cloned().collect(),
            notifications: store.notifications.values().cloned().collect(),
        }
    }
}

impl AppState {
    fn persist(&self, store: &Store) -> rusqlite::Result<()> {
        let mut snapshot = Snapshot::from(store);
        let mut version = self.snapshot_version.lock().unwrap();
        let next_version = version.saturating_add(1);
        snapshot.snapshot_version = next_version;
        let snapshot = serde_json::to_string(&snapshot)
            .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
        let connection = self.db.lock().unwrap();
        let transaction = connection.unchecked_transaction()?;
        transaction.execute(
            "INSERT INTO host_state (id, snapshot_json) VALUES (1, ?1) ON CONFLICT(id) DO UPDATE SET snapshot_json = excluded.snapshot_json",
            params![snapshot],
        )?;
        transaction.execute(
            "INSERT INTO host_events (global_position, event_id, event_type, snapshot_version, occurred_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![next_version as i64, Uuid::new_v4().to_string(), "projection.snapshot.updated", next_version as i64, now()],
        )?;
        transaction.execute("DELETE FROM command_journal", [])?;
        for ((canvas_id, key), run_id) in &store.run_idempotency {
            let Some(run) = store.runs.get(run_id) else {
                continue;
            };
            transaction.execute(
                "INSERT INTO command_journal (canvas_id, idempotency_key, run_id, revision, entrypoint) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![canvas_id.to_string(), key, run_id.to_string(), run.revision as i64, "default"],
            )?;
        }
        let foreign_key_violations: i64 =
            transaction.query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| {
                row.get(0)
            })?;
        if foreign_key_violations != 0 {
            return Err(invalid_persisted_state(
                "Database contains foreign key violations after persistence",
            ));
        }
        transaction.commit()?;
        *version = next_version;
        Ok(())
    }
}

fn initialize_database(connection: &mut Connection, file_backed: bool) -> rusqlite::Result<()> {
    connection.busy_timeout(DATABASE_BUSY_TIMEOUT)?;
    connection.pragma_update(None, "foreign_keys", true)?;
    connection.pragma_update(None, "synchronous", "NORMAL")?;
    if file_backed {
        connection.pragma_update(None, "journal_mode", "WAL")?;
    }

    let version: i64 = connection.pragma_query_value(None, "user_version", |row| row.get(0))?;
    if version > CURRENT_DATABASE_VERSION {
        return Err(invalid_persisted_state(format!(
            "Database schema version {version} is newer than supported version {CURRENT_DATABASE_VERSION}"
        )));
    }
    let mut statement = connection.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )?;
    let existing_tables = statement
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);
    if !existing_tables.is_empty()
        && !HOST_TABLES
            .iter()
            .all(|expected| existing_tables.iter().any(|actual| actual == expected))
    {
        return Err(invalid_persisted_state(
            "Host database has a partial schema; refusing to initialize it",
        ));
    }

    let transaction = connection.transaction()?;
    if version == 0 {
        transaction.execute_batch(
            "CREATE TABLE IF NOT EXISTS host_state (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot_json TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS command_journal (
           canvas_id TEXT NOT NULL,
           idempotency_key TEXT NOT NULL,
           run_id TEXT NOT NULL,
           revision INTEGER NOT NULL,
           entrypoint TEXT NOT NULL,
           PRIMARY KEY (canvas_id, idempotency_key),
           CHECK (length(trim(idempotency_key)) > 0),
           CHECK (revision >= 0),
           CHECK (entrypoint = 'default')
             );
             CREATE TABLE IF NOT EXISTS host_events (
           global_position INTEGER PRIMARY KEY,
           event_id TEXT NOT NULL UNIQUE,
           event_type TEXT NOT NULL,
           snapshot_version INTEGER NOT NULL,
           occurred_at TEXT NOT NULL,
           CHECK (global_position > 0),
           CHECK (snapshot_version = global_position),
           CHECK (event_type = 'projection.snapshot.updated')
             );",
        )?;
        if !table_sql_contains(
            &transaction,
            "command_journal",
            "check (length(trim(idempotency_key)) > 0)",
        )? {
            rebuild_command_journal(&transaction)?;
        }
        if !table_sql_contains(
            &transaction,
            "host_events",
            "check (event_type = 'projection.snapshot.updated')",
        )? {
            rebuild_host_events(&transaction)?;
        }
        transaction.execute_batch(
            "CREATE INDEX IF NOT EXISTS idx_host_events_snapshot_version
               ON host_events(snapshot_version);
             PRAGMA user_version = 1;",
        )?;
    }
    transaction.commit()?;

    verify_database_schema(connection)?;
    let violations: i64 =
        connection.query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })?;
    if violations != 0 {
        return Err(invalid_persisted_state(
            "Database contains foreign key violations",
        ));
    }
    Ok(())
}

fn open_database(path: PathBuf) -> rusqlite::Result<(Connection, Store, u64)> {
    let file_backed = path != PathBuf::from(":memory:");
    let mut connection = Connection::open(path)?;
    initialize_database(&mut connection, file_backed)?;
    let (store, snapshot_version) = load_persisted_state(&connection)?;
    Ok((connection, store, snapshot_version))
}

fn load_persisted_state(connection: &Connection) -> rusqlite::Result<(Store, u64)> {
    let snapshot_json = connection
        .query_row(
            "SELECT snapshot_json FROM host_state WHERE id = 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    let loaded_snapshot = snapshot_json
        .map(|json| {
            serde_json::from_str::<Snapshot>(&json)
                .map_err(|error| invalid_persisted_state(format!("Invalid Host snapshot: {error}")))
        })
        .transpose()?;
    let snapshot_version = loaded_snapshot
        .as_ref()
        .map(|snapshot| snapshot.snapshot_version)
        .unwrap_or_default();
    let (event_count, latest_event_position): (i64, Option<i64>) = connection.query_row(
        "SELECT COUNT(*), MAX(global_position) FROM host_events",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;
    if latest_event_position.unwrap_or_default() < 0
        || latest_event_position.unwrap_or_default() as u64 != snapshot_version
        || event_count as u64 != snapshot_version
    {
        return Err(invalid_persisted_state(
            "Host snapshot version and event cursor do not match",
        ));
    }
    let mut store = loaded_snapshot.map(Store::from).unwrap_or_default();
    let mut statement = connection.prepare(
        "SELECT canvas_id, idempotency_key, run_id, revision, entrypoint FROM command_journal",
    )?;
    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, String>(4)?,
        ))
    })?;
    for row in rows {
        let (canvas_id, key, run_id, revision, entrypoint) = row?;
        let canvas_id = Uuid::parse_str(&canvas_id).map_err(|error| {
            invalid_persisted_state(format!("Invalid journal canvas ID: {error}"))
        })?;
        let run_id = Uuid::parse_str(&run_id)
            .map_err(|error| invalid_persisted_state(format!("Invalid journal Run ID: {error}")))?;
        let run = store
            .runs
            .get(&run_id)
            .ok_or_else(|| invalid_persisted_state("Command journal references a missing Run"))?;
        if key.trim().is_empty()
            || revision < 0
            || run.canvas_id != canvas_id
            || run.revision != revision as u64
            || entrypoint != "default"
        {
            return Err(invalid_persisted_state(
                "Command journal does not match its persisted Run",
            ));
        }
        store.run_idempotency.insert((canvas_id, key), run_id);
    }
    Ok((store, snapshot_version))
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn graph_json_for_canvas(store: &Store, canvas_id: Uuid) -> String {
    let mut nodes = store
        .nodes
        .values()
        .filter(|node| node.canvas_id == canvas_id)
        .cloned()
        .collect::<Vec<_>>();
    nodes.sort_by_key(|node| node.id);
    let mut edges = store
        .edges
        .values()
        .filter(|edge| edge.canvas_id == canvas_id)
        .cloned()
        .collect::<Vec<_>>();
    edges.sort_by_key(|edge| edge.id);
    serde_json::json!({
        "nodes": nodes,
        "edges": edges
    })
    .to_string()
}

fn mark_canvas_dirty(store: &mut Store, canvas_id: Uuid) -> Result<(), HostError> {
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    canvas.draft_revision = canvas.draft_revision.saturating_add(1);
    canvas.draft_dirty = true;
    canvas.updated_at = now();
    Ok(())
}

fn ensure_canvas_editable(store: &Store, canvas_id: Uuid) -> Result<(), HostError> {
    let canvas = store
        .canvases
        .get(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    if matches!(canvas.status, RunStatus::Running | RunStatus::WaitingInput)
        || store.runs.values().any(|run| {
            run.canvas_id == canvas_id
                && matches!(run.status, RunStatus::Running | RunStatus::WaitingInput)
        })
    {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "CANVAS_HAS_ACTIVE_RUN",
            "Cannot edit this canvas while a run is active or waiting for input",
            false,
        ));
    }
    Ok(())
}

fn sha256_digest(content: &str) -> String {
    let digest = Sha256::digest(content.as_bytes());
    format!("sha256:{digest:x}")
}

fn validate_canvas_graph(store: &Store, canvas_id: Uuid) -> Result<(), &'static str> {
    let canvas = store
        .canvases
        .get(&canvas_id)
        .ok_or("Canvas was not found")?;
    let nodes = store
        .nodes
        .values()
        .filter(|node| node.canvas_id == canvas_id)
        .collect::<Vec<_>>();
    if nodes.is_empty() {
        return Err("The canvas has no nodes");
    }
    let entrypoint_id = canvas
        .default_entrypoint_node_id
        .ok_or("The canvas has no manual entrypoint")?;
    if !nodes.iter().any(|node| node.id == entrypoint_id) {
        return Err("The default entrypoint node was not found");
    }
    let supported = [
        "trigger.start",
        "input.text",
        "task.manual",
        "output.text",
        "workspace.scan",
        "workspace.analyze",
    ];
    if nodes
        .iter()
        .any(|node| !supported.contains(&node.kind.as_str()))
    {
        return Err("A node kind is not executable in this MVP");
    }
    let mut adjacency: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
    for edge in store
        .edges
        .values()
        .filter(|edge| edge.canvas_id == canvas_id)
    {
        if edge.source_node_id == edge.target_node_id {
            return Err("A node cannot connect to itself");
        }
        let source = nodes
            .iter()
            .find(|node| node.id == edge.source_node_id)
            .ok_or("An edge source node was not found")?;
        let target = nodes
            .iter()
            .find(|node| node.id == edge.target_node_id)
            .ok_or("An edge target node was not found")?;
        let source_port = source
            .ports
            .iter()
            .find(|port| port.id == edge.source_port_id)
            .ok_or("An edge source port was not found")?;
        let target_port = target
            .ports
            .iter()
            .find(|port| port.id == edge.target_port_id)
            .ok_or("An edge target port was not found")?;
        if !matches!(source_port.direction, PortDirection::Output)
            || !matches!(target_port.direction, PortDirection::Input)
            || std::mem::discriminant(&source_port.kind)
                != std::mem::discriminant(&target_port.kind)
            || std::mem::discriminant(&source_port.kind) != std::mem::discriminant(&edge.kind)
        {
            return Err("An edge connects incompatible ports");
        }
        if matches!(
            edge.kind,
            PortKind::Flow | PortKind::Data | PortKind::Event | PortKind::Resource
        ) {
            adjacency
                .entry(edge.source_node_id)
                .or_default()
                .push(edge.target_node_id);
        }
    }
    let mut visited = std::collections::HashSet::new();
    let mut queue = vec![entrypoint_id];
    while let Some(node_id) = queue.pop() {
        if !visited.insert(node_id) {
            continue;
        }
        if let Some(next) = adjacency.get(&node_id) {
            queue.extend(next.iter().copied());
        }
    }
    if nodes.iter().any(|node| {
        !visited.contains(&node.id)
            && !matches!(
                node.kind.as_str(),
                "input.text" | "input.file" | "workspace.scan"
            )
    }) {
        return Err("Every required node must be reachable from the selected entrypoint");
    }
    Ok(())
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct HostExecutionPlan {
    entrypoint_node_id: Uuid,
    node_order: Vec<Uuid>,
}

fn compile_host_execution_plan(
    store: &Store,
    canvas_id: Uuid,
) -> Result<HostExecutionPlan, &'static str> {
    validate_canvas_graph(store, canvas_id)?;
    let entrypoint_node_id = store
        .canvases
        .get(&canvas_id)
        .and_then(|canvas| canvas.default_entrypoint_node_id)
        .ok_or("The canvas has no manual entrypoint")?;
    let mut flow_edges = store
        .edges
        .values()
        .filter(|edge| {
            edge.canvas_id == canvas_id
                && matches!(
                    edge.kind,
                    PortKind::Flow | PortKind::Data | PortKind::Event | PortKind::Resource
                )
        })
        .collect::<Vec<_>>();
    flow_edges.sort_by_key(|edge| edge.id);
    let mut adjacency = HashMap::<Uuid, Vec<Uuid>>::new();
    for edge in flow_edges {
        adjacency
            .entry(edge.source_node_id)
            .or_default()
            .push(edge.target_node_id);
    }
    let mut node_order = Vec::new();
    let mut visited = std::collections::HashSet::new();
    let mut queue = std::collections::VecDeque::from([entrypoint_node_id]);
    while let Some(node_id) = queue.pop_front() {
        if !visited.insert(node_id) {
            continue;
        }
        node_order.push(node_id);
        if let Some(next) = adjacency.get(&node_id) {
            queue.extend(next.iter().copied());
        }
    }
    Ok(HostExecutionPlan {
        entrypoint_node_id,
        node_order,
    })
}

fn output_port_id(node: &CanvasNode, name: &str) -> Option<Uuid> {
    node.ports
        .iter()
        .find(|port| {
            port.name == name
                && matches!(port.direction, PortDirection::Output)
                && matches!(port.kind, PortKind::Data | PortKind::Resource)
        })
        .map(|port| port.id)
}

fn primary_value_output_port_id(node: &CanvasNode) -> Option<Uuid> {
    let preferred_name = match node.kind.as_str() {
        "input.text" => "Text",
        "input.file" => "File",
        "workspace.scan" => "Result",
        "workspace.analyze" => "Report",
        _ => "Result",
    };
    output_port_id(node, preferred_name).or_else(|| {
        node.ports
            .iter()
            .find(|port| {
                matches!(port.direction, PortDirection::Output)
                    && matches!(port.kind, PortKind::Data | PortKind::Resource)
            })
            .map(|port| port.id)
    })
}

fn runtime_value_text(value: &RuntimeValue) -> Result<String, String> {
    match value {
        RuntimeValue::Text { value } => Ok(value.clone()),
        RuntimeValue::Number { value } => Ok(value.to_string()),
        RuntimeValue::Boolean { value } => Ok(value.to_string()),
        RuntimeValue::Json { value } => serde_json::to_string_pretty(value)
            .map_err(|error| format!("Unable to render JSON runtime value: {error}")),
        RuntimeValue::ArtifactRef { artifact_id } => Ok(artifact_id.to_string()),
        RuntimeValue::ResourceRef { resource_id } => Ok(resource_id.to_string()),
    }
}

fn configured_text_value(node: &CanvasNode) -> Option<String> {
    node.config
        .get("inputValue")
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn connected_runtime_value<'a>(
    store: &Store,
    canvas_id: Uuid,
    target_node: &CanvasNode,
    target_port_name: &str,
    port_values: &'a HashMap<Uuid, RuntimeValue>,
) -> Option<&'a RuntimeValue> {
    let target_port = target_node.ports.iter().find(|port| {
        port.name == target_port_name && matches!(port.direction, PortDirection::Input)
    })?;
    let edge = store
        .edges
        .values()
        .find(|edge| edge.canvas_id == canvas_id && edge.target_port_id == target_port.id)?;
    port_values.get(&edge.source_port_id)
}

fn connected_text_value(
    store: &Store,
    canvas_id: Uuid,
    target_node: &CanvasNode,
    target_port_name: &str,
    port_values: &HashMap<Uuid, RuntimeValue>,
) -> Option<String> {
    connected_runtime_value(store, canvas_id, target_node, target_port_name, port_values)
        .and_then(RuntimeValue::as_text)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn resolve_text_output(
    store: &Store,
    canvas_id: Uuid,
    port_values: &HashMap<Uuid, RuntimeValue>,
) -> Result<Option<String>, String> {
    let output_nodes = store
        .nodes
        .values()
        .filter(|node| node.canvas_id == canvas_id && node.kind == "output.text")
        .collect::<Vec<_>>();
    if output_nodes.is_empty() {
        return Ok(None);
    }

    let mut values = Vec::with_capacity(output_nodes.len());
    for output_node in output_nodes {
        values.push(resolve_output_node(
            store,
            canvas_id,
            output_node,
            port_values,
        )?);
    }
    Ok(Some(values.join("\n")))
}

fn resolve_output_node(
    store: &Store,
    canvas_id: Uuid,
    output_node: &CanvasNode,
    port_values: &HashMap<Uuid, RuntimeValue>,
) -> Result<String, String> {
    let input_port = output_node
        .ports
        .iter()
        .find(|port| port.name == "Input" && matches!(port.direction, PortDirection::Input))
        .ok_or_else(|| "Text Output is missing its Input port".to_string())?;
    let edge = store
        .edges
        .values()
        .find(|edge| edge.canvas_id == canvas_id && edge.target_port_id == input_port.id)
        .ok_or_else(|| "Connect a text value to Text Output.Input before running".to_string())?;
    let value = port_values
        .get(&edge.source_port_id)
        .ok_or_else(|| "The connected source port did not produce a runtime value".to_string())?;
    runtime_value_text(value)
}

fn resolve_workspace_scan(store: &Store, canvas_id: Uuid) -> Result<Option<String>, String> {
    let scan_nodes = store
        .nodes
        .values()
        .filter(|node| node.canvas_id == canvas_id && node.kind == "workspace.scan")
        .collect::<Vec<_>>();
    if scan_nodes.is_empty() {
        return Ok(None);
    }

    let canvas = store
        .canvases
        .get(&canvas_id)
        .ok_or_else(|| "Canvas was not found".to_string())?;
    let workspace = store
        .workspaces
        .get(&canvas.workspace_id)
        .ok_or_else(|| "Workspace was not found".to_string())?;
    let root = FsPath::new(&workspace.path);
    if !root.is_dir() {
        return Err(format!(
            "Workspace path is not an accessible directory: {}",
            root.display()
        ));
    }

    let max_entries = scan_nodes
        .iter()
        .filter_map(|node| {
            node.config
                .get("maxEntries")
                .and_then(serde_json::Value::as_u64)
        })
        .min()
        .unwrap_or(2000)
        .clamp(1, 10_000) as usize;
    let max_depth = scan_nodes
        .iter()
        .filter_map(|node| {
            node.config
                .get("maxDepth")
                .and_then(serde_json::Value::as_u64)
        })
        .min()
        .unwrap_or(12)
        .clamp(1, 32) as usize;
    let ignored = [
        ".git",
        "node_modules",
        "target",
        "dist",
        "build",
        ".idea",
        ".gradle",
        ".venv",
    ];
    let mut pending = vec![(root.to_path_buf(), 0usize)];
    let mut files = 0usize;
    let mut directories = 0usize;
    let mut entries = Vec::new();
    let mut truncated = false;

    while let Some((directory, depth)) = pending.pop() {
        let listing = read_dir(&directory)
            .map_err(|error| format!("Unable to read {}: {error}", directory.display()))?;
        for item in listing {
            if files + directories >= max_entries {
                truncated = true;
                break;
            }
            let item =
                item.map_err(|error| format!("Unable to inspect workspace entry: {error}"))?;
            let path = item.path();
            let name = item.file_name().to_string_lossy().to_string();
            if path.is_dir() {
                if ignored.contains(&name.as_str()) {
                    continue;
                }
                directories += 1;
                if depth < max_depth {
                    pending.push((path.clone(), depth + 1));
                } else {
                    truncated = true;
                }
            } else if path.is_file() {
                files += 1;
                if entries.len() < 200 {
                    let relative = path
                        .strip_prefix(root)
                        .unwrap_or(path.as_path())
                        .to_string_lossy()
                        .replace('\\', "/");
                    entries.push(relative);
                }
            }
        }
        if truncated {
            break;
        }
    }
    entries.sort();

    serde_json::to_string_pretty(&serde_json::json!({
        "workspacePath": workspace.path,
        "files": files,
        "directories": directories,
        "truncated": truncated,
        "sampleFiles": entries,
        "limits": {
            "maxEntries": max_entries,
            "maxDepth": max_depth
        }
    }))
    .map(Some)
    .map_err(|error| format!("Unable to serialize workspace scan result: {error}"))
}

fn read_bounded_text(path: &FsPath, max_bytes: u64) -> Result<String, String> {
    let metadata = path
        .metadata()
        .map_err(|error| format!("Unable to inspect {}: {error}", path.display()))?;
    if metadata.len() > max_bytes {
        return Err(format!(
            "{} exceeds the {} byte analysis limit",
            path.display(),
            max_bytes
        ));
    }
    let mut content = String::new();
    File::open(path)
        .map_err(|error| format!("Unable to open {}: {error}", path.display()))?
        .take(max_bytes + 1)
        .read_to_string(&mut content)
        .map_err(|error| format!("Unable to read {} as UTF-8 text: {error}", path.display()))?;
    Ok(content)
}

fn xml_tag(content: &str, tag: &str) -> Option<String> {
    let start_marker = format!("<{tag}>");
    let end_marker = format!("</{tag}>");
    let start = content.find(&start_marker)? + start_marker.len();
    let end = content[start..].find(&end_marker)? + start;
    let value = content[start..end].trim();
    (!value.is_empty()).then(|| value.to_string())
}

fn toml_string(content: &str, key: &str) -> Option<String> {
    content.lines().find_map(|line| {
        let line = line.trim();
        let (candidate, value) = line.split_once('=')?;
        if candidate.trim() != key {
            return None;
        }
        let value = value.trim().trim_matches(['"', '\'']);
        (!value.is_empty()).then(|| value.to_string())
    })
}

fn manifest_summary(path: &FsPath, relative: &str) -> serde_json::Value {
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    let content = read_bounded_text(path, 256 * 1024);
    match (name, content) {
        ("package.json", Ok(content)) => {
            let parsed = serde_json::from_str::<serde_json::Value>(&content).ok();
            serde_json::json!({
                "path": relative,
                "kind": "Node.js package",
                "name": parsed.as_ref().and_then(|value| value.get("name")).and_then(serde_json::Value::as_str),
                "scripts": parsed.as_ref().and_then(|value| value.get("scripts")).and_then(serde_json::Value::as_object).map(|value| value.len()),
                "dependencies": parsed.as_ref().and_then(|value| value.get("dependencies")).and_then(serde_json::Value::as_object).map(|value| value.len()).unwrap_or(0)
                    + parsed.as_ref().and_then(|value| value.get("devDependencies")).and_then(serde_json::Value::as_object).map(|value| value.len()).unwrap_or(0)
            })
        }
        ("pom.xml", Ok(content)) => serde_json::json!({
            "path": relative,
            "kind": "Maven project",
            "groupId": xml_tag(&content, "groupId"),
            "artifactId": xml_tag(&content, "artifactId"),
            "version": xml_tag(&content, "version")
        }),
        ("Cargo.toml", Ok(content)) => serde_json::json!({
            "path": relative,
            "kind": "Rust package",
            "name": toml_string(&content, "name"),
            "version": toml_string(&content, "version")
        }),
        ("pyproject.toml", Ok(content)) => serde_json::json!({
            "path": relative,
            "kind": "Python package",
            "name": toml_string(&content, "name"),
            "version": toml_string(&content, "version")
        }),
        ("go.mod", Ok(content)) => serde_json::json!({
            "path": relative,
            "kind": "Go module",
            "module": content.lines().find_map(|line| line.trim().strip_prefix("module ")).map(str::trim)
        }),
        ("build.gradle", Ok(_)) | ("build.gradle.kts", Ok(_)) => serde_json::json!({
            "path": relative,
            "kind": "Gradle project"
        }),
        ("settings.gradle", Ok(_)) | ("settings.gradle.kts", Ok(_)) => serde_json::json!({
            "path": relative,
            "kind": "Gradle workspace"
        }),
        ("requirements.txt", Ok(content)) => serde_json::json!({
            "path": relative,
            "kind": "Python requirements",
            "dependencies": content.lines().filter(|line| {
                let line = line.trim();
                !line.is_empty() && !line.starts_with('#')
            }).count()
        }),
        (_, Err(error)) => serde_json::json!({
            "path": relative,
            "kind": "Manifest",
            "readError": error
        }),
        _ => serde_json::json!({
            "path": relative,
            "kind": "Manifest"
        }),
    }
}

fn language_name(extension: &str) -> &str {
    match extension {
        "java" => "Java",
        "kt" | "kts" => "Kotlin",
        "rs" => "Rust",
        "ts" | "tsx" => "TypeScript",
        "js" | "jsx" | "mjs" | "cjs" => "JavaScript",
        "py" => "Python",
        "go" => "Go",
        "cs" => "C#",
        "c" | "h" => "C",
        "cpp" | "cc" | "cxx" | "hpp" => "C++",
        "sql" => "SQL",
        "html" | "htm" => "HTML",
        "css" | "scss" | "less" => "CSS",
        "xml" => "XML",
        "json" => "JSON",
        "yaml" | "yml" => "YAML",
        "md" => "Markdown",
        _ => extension,
    }
}

fn resolve_project_analysis(
    store: &Store,
    canvas_id: Uuid,
    port_values: &HashMap<Uuid, RuntimeValue>,
) -> Result<Option<String>, String> {
    let analyze_nodes = store
        .nodes
        .values()
        .filter(|node| node.canvas_id == canvas_id && node.kind == "workspace.analyze")
        .collect::<Vec<_>>();
    if analyze_nodes.is_empty() {
        return Ok(None);
    }
    let canvas = store
        .canvases
        .get(&canvas_id)
        .ok_or_else(|| "Canvas was not found".to_string())?;
    let workspace = store
        .workspaces
        .get(&canvas.workspace_id)
        .ok_or_else(|| "Workspace was not found".to_string())?;
    let root = FsPath::new(&workspace.path);
    if !root.is_dir() {
        return Err(format!(
            "Workspace path is not an accessible directory: {}",
            root.display()
        ));
    }

    let max_entries = analyze_nodes
        .iter()
        .filter_map(|node| {
            node.config
                .get("maxEntries")
                .and_then(serde_json::Value::as_u64)
        })
        .min()
        .unwrap_or(5000)
        .clamp(1, 20_000) as usize;
    let max_depth = analyze_nodes
        .iter()
        .filter_map(|node| {
            node.config
                .get("maxDepth")
                .and_then(serde_json::Value::as_u64)
        })
        .min()
        .unwrap_or(16)
        .clamp(1, 32) as usize;
    let request = analyze_nodes
        .iter()
        .find_map(|node| connected_text_value(store, canvas_id, node, "Request", port_values))
        .or_else(|| {
            analyze_nodes.iter().find_map(|node| {
                node.config
                    .get("request")
                    .and_then(serde_json::Value::as_str)
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(str::to_string)
            })
        })
        .unwrap_or_else(|| {
            "Analyze the project structure, build system, languages, tests, and likely entrypoints."
                .to_string()
        });

    let ignored = [
        ".git",
        "node_modules",
        "target",
        "dist",
        "build",
        ".idea",
        ".gradle",
        ".venv",
        "vendor",
        "coverage",
    ];
    let manifest_names = [
        "pom.xml",
        "build.gradle",
        "build.gradle.kts",
        "settings.gradle",
        "settings.gradle.kts",
        "package.json",
        "Cargo.toml",
        "pyproject.toml",
        "requirements.txt",
        "go.mod",
    ];
    let mut pending = vec![(root.to_path_buf(), 0usize)];
    let mut files = 0usize;
    let mut directories = 0usize;
    let mut test_files = 0usize;
    let mut truncated = false;
    let mut language_counts = BTreeMap::<String, usize>::new();
    let mut top_level_directories = BTreeSet::<String>::new();
    let mut entrypoints = BTreeSet::<String>::new();
    let mut manifests = Vec::<(PathBuf, String)>::new();
    let mut has_readme = false;

    while let Some((directory, depth)) = pending.pop() {
        let listing = read_dir(&directory)
            .map_err(|error| format!("Unable to read {}: {error}", directory.display()))?;
        for item in listing {
            if files + directories >= max_entries {
                truncated = true;
                break;
            }
            let item =
                item.map_err(|error| format!("Unable to inspect workspace entry: {error}"))?;
            let file_type = item
                .file_type()
                .map_err(|error| format!("Unable to inspect {}: {error}", item.path().display()))?;
            if file_type.is_symlink() {
                continue;
            }
            let path = item.path();
            let name = item.file_name().to_string_lossy().to_string();
            if file_type.is_dir() {
                if ignored.contains(&name.as_str()) {
                    continue;
                }
                directories += 1;
                if depth == 0 {
                    top_level_directories.insert(name.clone());
                }
                if depth < max_depth {
                    pending.push((path, depth + 1));
                } else {
                    truncated = true;
                }
                continue;
            }
            if !file_type.is_file() {
                continue;
            }
            files += 1;
            let relative = path
                .strip_prefix(root)
                .unwrap_or(path.as_path())
                .to_string_lossy()
                .replace('\\', "/");
            let lower = relative.to_ascii_lowercase();
            if lower == "readme.md" || lower == "readme" || lower.starts_with("readme.") {
                has_readme = true;
            }
            if lower.contains("/test/")
                || lower.contains("/tests/")
                || lower.contains("/__tests__/")
                || lower.ends_with("test.java")
                || lower.ends_with("tests.java")
                || lower.ends_with("_test.go")
                || lower.ends_with("_test.py")
                || lower.ends_with(".test.ts")
                || lower.ends_with(".spec.ts")
            {
                test_files += 1;
            }
            if let Some(extension) = path.extension().and_then(|value| value.to_str()) {
                *language_counts
                    .entry(extension.to_ascii_lowercase())
                    .or_default() += 1;
            }
            if manifest_names.contains(&name.as_str()) && manifests.len() < 64 {
                manifests.push((path.clone(), relative.clone()));
            }
            let filename = name.to_ascii_lowercase();
            if matches!(
                filename.as_str(),
                "main.rs"
                    | "main.go"
                    | "main.py"
                    | "app.py"
                    | "main.ts"
                    | "main.tsx"
                    | "index.ts"
                    | "index.tsx"
                    | "program.cs"
            ) || filename.ends_with("application.java")
            {
                if entrypoints.len() < 40 {
                    entrypoints.insert(relative);
                }
            }
        }
        if truncated {
            break;
        }
    }

    let mut project_types = BTreeSet::<String>::new();
    for (_, relative) in &manifests {
        let name = FsPath::new(relative)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        let project_type = match name {
            "pom.xml" => "Java / Maven",
            "build.gradle" | "build.gradle.kts" | "settings.gradle" | "settings.gradle.kts" => {
                "JVM / Gradle"
            }
            "package.json" => "Node.js / JavaScript",
            "Cargo.toml" => "Rust / Cargo",
            "pyproject.toml" | "requirements.txt" => "Python",
            "go.mod" => "Go",
            _ => "Unknown",
        };
        project_types.insert(project_type.to_string());
    }
    let manifest_reports = manifests
        .iter()
        .take(24)
        .map(|(path, relative)| manifest_summary(path, relative))
        .collect::<Vec<_>>();
    let mut languages = language_counts
        .into_iter()
        .map(|(extension, count)| {
            serde_json::json!({
                "language": language_name(&extension),
                "extension": extension,
                "files": count
            })
        })
        .collect::<Vec<_>>();
    languages.sort_by(|left, right| {
        right["files"]
            .as_u64()
            .cmp(&left["files"].as_u64())
            .then_with(|| left["language"].as_str().cmp(&right["language"].as_str()))
    });
    languages.truncate(20);

    let mut findings = Vec::<String>::new();
    if project_types.len() > 1 {
        findings.push(format!(
            "Multiple build ecosystems were detected: {}.",
            project_types.iter().cloned().collect::<Vec<_>>().join(", ")
        ));
    } else if let Some(project_type) = project_types.first() {
        findings.push(format!(
            "The primary detected project ecosystem is {project_type}."
        ));
    } else {
        findings.push("No supported root or module manifest was detected.".to_string());
    }
    if test_files == 0 {
        findings.push("No conventional test files were detected in the bounded scan.".to_string());
    } else {
        findings.push(format!(
            "{test_files} conventional test files were detected."
        ));
    }
    if !has_readme {
        findings.push("No top-level README was detected.".to_string());
    }
    if truncated {
        findings.push(
            "The inventory reached its configured safety limit; results are partial.".to_string(),
        );
    }

    serde_json::to_string_pretty(&serde_json::json!({
        "schemaVersion": "seekwd.project-analysis/0.1",
        "request": request,
        "workspace": {
            "name": workspace.name,
            "path": workspace.path
        },
        "inventory": {
            "files": files,
            "directories": directories,
            "testFiles": test_files,
            "truncated": truncated,
            "limits": {
                "maxEntries": max_entries,
                "maxDepth": max_depth
            }
        },
        "projectTypes": project_types,
        "languages": languages,
        "topLevelDirectories": top_level_directories,
        "likelyEntrypoints": entrypoints,
        "manifests": manifest_reports,
        "findings": findings,
        "securityBoundary": {
            "workspaceReadOnly": true,
            "networkAccess": false,
            "ignoredDirectories": ignored,
            "symlinksFollowed": false,
            "sourceContentsRead": false,
            "manifestReadLimitBytes": 262144
        }
    }))
    .map(Some)
    .map_err(|error| format!("Unable to serialize project analysis: {error}"))
}

fn resolve_run_output(
    store: &Store,
    canvas_id: Uuid,
    port_values: &HashMap<Uuid, RuntimeValue>,
) -> Result<Option<String>, String> {
    if let Some(value) = resolve_text_output(store, canvas_id, port_values)? {
        return Ok(Some(value));
    }
    if let Some(value) = resolve_project_analysis(store, canvas_id, port_values)? {
        return Ok(Some(value));
    }
    resolve_workspace_scan(store, canvas_id)
}

#[derive(Debug)]
enum HostRunAdvance {
    Waiting {
        node_id: Uuid,
        prompt: String,
        completed_node_ids: Vec<Uuid>,
        port_values: HashMap<Uuid, RuntimeValue>,
    },
    Succeeded {
        result: Option<String>,
        completed_node_ids: Vec<Uuid>,
        port_values: HashMap<Uuid, RuntimeValue>,
    },
}

fn advance_host_execution(
    store: &Store,
    canvas_id: Uuid,
    completed_node_ids: &[Uuid],
    initial_port_values: &HashMap<Uuid, RuntimeValue>,
) -> Result<HostRunAdvance, String> {
    let plan = compile_host_execution_plan(store, canvas_id).map_err(str::to_string)?;
    let mut completed = completed_node_ids
        .iter()
        .copied()
        .collect::<std::collections::HashSet<_>>();
    let mut ordered_completed = completed_node_ids.to_vec();
    let mut port_values = initial_port_values.clone();
    let mut final_result = None;

    for node_id in plan.node_order {
        if completed.contains(&node_id) {
            continue;
        }
        let node = store
            .nodes
            .get(&node_id)
            .ok_or_else(|| format!("Execution plan references missing node {node_id}"))?;
        match node.kind.as_str() {
            "trigger.start" => {}
            "input.text" => {
                if let Some(value) = configured_text_value(node) {
                    let port_id = output_port_id(node, "Text")
                        .ok_or_else(|| "Text Input is missing its Text output port".to_string())?;
                    port_values.insert(port_id, RuntimeValue::text(value));
                    final_result = port_values
                        .get(&port_id)
                        .and_then(RuntimeValue::as_text)
                        .map(str::to_string);
                } else if primary_value_output_port_id(node)
                    .is_some_and(|port_id| port_values.contains_key(&port_id))
                {
                } else {
                    return Ok(HostRunAdvance::Waiting {
                        node_id: node.id,
                        prompt: format!("Enter a value for {}", node.name),
                        completed_node_ids: ordered_completed,
                        port_values,
                    });
                }
            }
            "task.manual" => {
                let prompt = node
                    .config
                    .get("instruction")
                    .and_then(serde_json::Value::as_str)
                    .filter(|value| !value.trim().is_empty())
                    .map(str::to_string)
                    .unwrap_or_else(|| format!("Complete the manual task: {}", node.name));
                return Ok(HostRunAdvance::Waiting {
                    node_id: node.id,
                    prompt,
                    completed_node_ids: ordered_completed,
                    port_values,
                });
            }
            "workspace.scan" => {
                let value = resolve_workspace_scan(store, canvas_id)?
                    .ok_or_else(|| "Workspace scan did not produce output".to_string())?;
                let json = serde_json::from_str(&value)
                    .map_err(|error| format!("Workspace scan produced invalid JSON: {error}"))?;
                let port_id = output_port_id(node, "Result").ok_or_else(|| {
                    "Workspace Scan is missing its Result output port".to_string()
                })?;
                port_values.insert(port_id, RuntimeValue::Json { value: json });
                final_result = Some(value);
            }
            "workspace.analyze" => {
                let value = resolve_project_analysis(store, canvas_id, &port_values)?
                    .ok_or_else(|| "Project analysis did not produce a report".to_string())?;
                let json = serde_json::from_str(&value)
                    .map_err(|error| format!("Project analysis produced invalid JSON: {error}"))?;
                let port_id = output_port_id(node, "Report").ok_or_else(|| {
                    "Project Analyze is missing its Report output port".to_string()
                })?;
                port_values.insert(port_id, RuntimeValue::Json { value: json });
                final_result = Some(value);
            }
            "output.text" => {
                let value = resolve_output_node(store, canvas_id, node, &port_values)?;
                final_result = Some(value);
            }
            kind => {
                return Err(format!(
                    "Node kind {kind} is not executable by the local Host"
                ));
            }
        }
        completed.insert(node.id);
        ordered_completed.push(node.id);
    }

    if final_result.is_none() {
        final_result = resolve_run_output(store, canvas_id, &port_values)?;
    }
    Ok(HostRunAdvance::Succeeded {
        result: final_result,
        completed_node_ids: ordered_completed,
        port_values,
    })
}

async fn list_workspaces(State(state): State<AppState>) -> Json<Vec<Workspace>> {
    Json(
        state
            .inner
            .lock()
            .unwrap()
            .workspaces
            .values()
            .cloned()
            .collect(),
    )
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "pong-host",
        "protocolVersion": "0.1.0"
    }))
}

async fn snapshot(State(state): State<AppState>) -> Json<Snapshot> {
    let store = state.inner.lock().unwrap();
    let version = *state.snapshot_version.lock().unwrap();
    let mut snapshot = Snapshot::from(&*store);
    snapshot.snapshot_version = version;
    Json(snapshot)
}

async fn events(
    State(state): State<AppState>,
    Query(query): Query<EventQuery>,
) -> Result<Json<EventBatch>, HostError> {
    let limit = query.limit.clamp(1, 500);
    let connection = state.db.lock().unwrap();
    let mut statement = connection
        .prepare(
            "SELECT event_id, event_type, global_position, snapshot_version, occurred_at
             FROM host_events WHERE global_position > ?1
             ORDER BY global_position ASC LIMIT ?2",
        )
        .map_err(persistence_error)?;
    let rows = statement
        .query_map(
            params![query.after_global_position as i64, limit as i64],
            |row| {
                let event_id: String = row.get(0)?;
                Ok(HostEvent {
                    event_id: Uuid::parse_str(&event_id).unwrap_or_else(|_| Uuid::nil()),
                    event_type: "projection.snapshot.updated",
                    global_position: row.get::<_, i64>(2)? as u64,
                    snapshot_version: row.get::<_, i64>(3)? as u64,
                    occurred_at: row.get(4)?,
                })
            },
        )
        .map_err(persistence_error)?;
    let events: Vec<HostEvent> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(persistence_error)?;
    let next_global_position = events
        .last()
        .map(|event| event.global_position)
        .unwrap_or(query.after_global_position);
    let snapshot_version = *state.snapshot_version.lock().unwrap();
    Ok(Json(EventBatch {
        events,
        next_global_position,
        snapshot_version,
    }))
}

async fn create_workspace(
    State(state): State<AppState>,
    Json(input): Json<CreateWorkspace>,
) -> Result<(StatusCode, Json<Workspace>), HostError> {
    let item = Workspace {
        id: Uuid::new_v4(),
        name: input.name.trim().to_string(),
        path: input.path,
        updated_at: now(),
    };
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    store.workspaces.insert(item.id, item.clone());
    persist_candidate(&state, &mut store, previous)?;
    Ok((StatusCode::CREATED, Json(item)))
}

async fn rename_workspace(
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
    Json(input): Json<RenameInput>,
) -> Result<Json<Workspace>, HostError> {
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    let workspace = store
        .workspaces
        .get_mut(&workspace_id)
        .ok_or_else(|| not_found_error("Workspace was not found"))?;
    let name = input.name.trim();
    if name.is_empty() {
        return Err(invalid_input_error("Workspace name is required"));
    }
    workspace.name = name.to_string();
    workspace.updated_at = now();
    let result = workspace.clone();
    persist_candidate(&state, &mut store, previous)?;
    Ok(Json(result))
}

async fn delete_workspace(
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
) -> Result<StatusCode, HostError> {
    let mut store = state.inner.lock().unwrap();
    if !store.workspaces.contains_key(&workspace_id) {
        return Err(not_found_error("Workspace was not found"));
    }
    let canvas_ids = store
        .canvases
        .values()
        .filter(|canvas| canvas.workspace_id == workspace_id)
        .map(|canvas| canvas.id)
        .collect::<Vec<_>>();
    if store.runs.values().any(|run| {
        canvas_ids.contains(&run.canvas_id)
            && matches!(
                run.status,
                RunStatus::Running | RunStatus::WaitingInput | RunStatus::Queued
            )
    }) {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "WORKSPACE_HAS_ACTIVE_RUN",
            "Cannot delete a workspace while one of its canvases has an active run",
            false,
        ));
    }
    let previous = store.clone();
    store.workspaces.remove(&workspace_id);
    store.canvases.retain(|id, _| !canvas_ids.contains(id));
    store
        .nodes
        .retain(|_, node| !canvas_ids.contains(&node.canvas_id));
    store
        .edges
        .retain(|_, edge| !canvas_ids.contains(&edge.canvas_id));
    store
        .revisions
        .retain(|_, revision| !canvas_ids.contains(&revision.canvas_id));
    store
        .runs
        .retain(|_, run| !canvas_ids.contains(&run.canvas_id));
    store.notifications.retain(|_, notification| {
        notification
            .canvas_id
            .is_none_or(|canvas_id| !canvas_ids.contains(&canvas_id))
    });
    store
        .run_idempotency
        .retain(|(canvas_id, _), _| !canvas_ids.contains(canvas_id));
    persist_candidate(&state, &mut store, previous)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn list_canvases(
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
) -> Json<Vec<Canvas>> {
    Json(
        state
            .inner
            .lock()
            .unwrap()
            .canvases
            .values()
            .filter(|item| item.workspace_id == workspace_id)
            .cloned()
            .collect(),
    )
}

fn port(node_id: Uuid, name: &str, direction: PortDirection, kind: PortKind) -> CanvasPort {
    CanvasPort {
        id: Uuid::new_v4(),
        node_id,
        name: name.to_string(),
        direction,
        kind,
    }
}

fn default_ports(node_id: Uuid, kind: &str) -> Vec<CanvasPort> {
    match kind {
        "trigger.start" => vec![
            port(node_id, "Start", PortDirection::Output, PortKind::Flow),
            port(node_id, "Event", PortDirection::Output, PortKind::Event),
        ],
        "output.text" => vec![
            port(node_id, "Input", PortDirection::Input, PortKind::Data),
            port(node_id, "Start", PortDirection::Input, PortKind::Flow),
        ],
        "input.text" => vec![
            port(node_id, "Start", PortDirection::Input, PortKind::Flow),
            port(node_id, "Text", PortDirection::Output, PortKind::Data),
            port(node_id, "Complete", PortDirection::Output, PortKind::Flow),
        ],
        "input.file" => vec![
            port(node_id, "Start", PortDirection::Input, PortKind::Flow),
            port(node_id, "File", PortDirection::Output, PortKind::Resource),
            port(node_id, "Complete", PortDirection::Output, PortKind::Flow),
        ],
        "control.approval" => vec![
            port(node_id, "Request", PortDirection::Input, PortKind::Data),
            port(node_id, "Approved", PortDirection::Output, PortKind::Event),
        ],
        "trigger.event" => vec![port(
            node_id,
            "Event",
            PortDirection::Output,
            PortKind::Event,
        )],
        "workspace.scan" => vec![
            port(node_id, "Start", PortDirection::Input, PortKind::Flow),
            port(node_id, "Result", PortDirection::Output, PortKind::Data),
            port(node_id, "Complete", PortDirection::Output, PortKind::Flow),
        ],
        "workspace.analyze" => vec![
            port(node_id, "Start", PortDirection::Input, PortKind::Flow),
            port(node_id, "Request", PortDirection::Input, PortKind::Data),
            port(node_id, "Report", PortDirection::Output, PortKind::Data),
            port(node_id, "Complete", PortDirection::Output, PortKind::Flow),
        ],
        _ => vec![
            port(node_id, "Input", PortDirection::Input, PortKind::Data),
            port(node_id, "Start", PortDirection::Input, PortKind::Flow),
            port(node_id, "Result", PortDirection::Output, PortKind::Data),
            port(
                node_id,
                "Artifact",
                PortDirection::Output,
                PortKind::Resource,
            ),
            port(node_id, "Complete", PortDirection::Output, PortKind::Event),
        ],
    }
}

async fn create_canvas(
    State(state): State<AppState>,
    Json(input): Json<CreateCanvas>,
) -> Result<(StatusCode, Json<Canvas>), HostError> {
    let item = Canvas {
        id: Uuid::new_v4(),
        workspace_id: input.workspace_id,
        name: input.name.trim().to_string(),
        status: RunStatus::Idle,
        default_entrypoint_node_id: None,
        revision: 0,
        draft_revision: 0,
        draft_dirty: false,
        updated_at: now(),
    };
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    store.canvases.insert(item.id, item.clone());
    persist_candidate(&state, &mut store, previous)?;
    Ok((StatusCode::CREATED, Json(item)))
}

async fn create_node(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<CreateNodeInput>,
) -> Result<(StatusCode, Json<CanvasNode>), HostError> {
    let name = input.name.trim();
    let kind = input.kind.trim();
    if name.is_empty() || kind.is_empty() {
        return Err(invalid_input_error("Node name and kind are required"));
    }
    let mut store = state.inner.lock().unwrap();
    if !store.canvases.contains_key(&canvas_id) {
        return Err(not_found_error("Canvas was not found"));
    }
    let node = CanvasNode {
        id: Uuid::new_v4(),
        canvas_id,
        name: name.to_string(),
        kind: kind.to_string(),
        ports: default_ports(Uuid::nil(), kind),
        config: serde_json::Map::new(),
    };
    let node = CanvasNode {
        ports: default_ports(node.id, &node.kind),
        ..node
    };
    let previous = store.clone();
    store.nodes.insert(node.id, node.clone());
    mark_canvas_dirty(&mut store, canvas_id)?;
    persist_candidate(&state, &mut store, previous)?;
    Ok((StatusCode::CREATED, Json(node)))
}

async fn update_node(
    State(state): State<AppState>,
    Path(node_id): Path<Uuid>,
    Json(input): Json<UpdateNodeInput>,
) -> Result<Json<CanvasNode>, HostError> {
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    let (canvas_id, result) = {
        let node = store
            .nodes
            .get_mut(&node_id)
            .ok_or_else(|| not_found_error("Node was not found"))?;
        if let Some(name) = input.name {
            let name = name.trim();
            if name.is_empty() {
                return Err(invalid_input_error("Node name is required"));
            }
            node.name = name.to_string();
        }
        if let Some(config) = input.config {
            for (key, value) in config {
                node.config.insert(key, value);
            }
        }
        (node.canvas_id, node.clone())
    };
    mark_canvas_dirty(&mut store, canvas_id)?;
    persist_candidate(&state, &mut store, previous)?;
    Ok(Json(result))
}

async fn delete_node(
    State(state): State<AppState>,
    Path(node_id): Path<Uuid>,
) -> Result<StatusCode, HostError> {
    let mut store = state.inner.lock().unwrap();
    let node = store
        .nodes
        .get(&node_id)
        .cloned()
        .ok_or_else(|| not_found_error("Node was not found"))?;
    ensure_canvas_editable(&store, node.canvas_id)?;
    let previous = store.clone();
    store.nodes.remove(&node_id);
    store
        .edges
        .retain(|_, edge| edge.source_node_id != node_id && edge.target_node_id != node_id);
    if let Some(canvas) = store.canvases.get_mut(&node.canvas_id) {
        if canvas.default_entrypoint_node_id == Some(node_id) {
            canvas.default_entrypoint_node_id = None;
        }
    }
    mark_canvas_dirty(&mut store, node.canvas_id)?;
    persist_candidate(&state, &mut store, previous)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn create_edge(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<CreateEdgeInput>,
) -> Result<(StatusCode, Json<CanvasEdge>), HostError> {
    if input.source_node_id == input.target_node_id {
        return Err(invalid_input_error("A node cannot connect to itself"));
    }
    let mut store = state.inner.lock().unwrap();
    if !store.canvases.contains_key(&canvas_id) {
        return Err(not_found_error("Canvas was not found"));
    }
    ensure_canvas_editable(&store, canvas_id)?;
    let Some(source_node) = store.nodes.get(&input.source_node_id) else {
        return Err(invalid_input_error("Source node was not found"));
    };
    let Some(target_node) = store.nodes.get(&input.target_node_id) else {
        return Err(invalid_input_error("Target node was not found"));
    };
    if source_node.canvas_id != canvas_id || target_node.canvas_id != canvas_id {
        return Err(invalid_input_error(
            "Both edge endpoints must belong to the canvas",
        ));
    }
    let Some(source_port) = source_node
        .ports
        .iter()
        .find(|port| port.id == input.source_port_id)
    else {
        return Err(invalid_input_error("Source port was not found"));
    };
    let Some(target_port) = target_node
        .ports
        .iter()
        .find(|port| port.id == input.target_port_id)
    else {
        return Err(invalid_input_error("Target port was not found"));
    };
    if !matches!(source_port.direction, PortDirection::Output)
        || !matches!(target_port.direction, PortDirection::Input)
        || std::mem::discriminant(&source_port.kind) != std::mem::discriminant(&target_port.kind)
        || std::mem::discriminant(&source_port.kind) != std::mem::discriminant(&input.kind)
    {
        return Err(invalid_input_error(
            "Edges must connect a compatible output port to an input port",
        ));
    }
    if store.edges.values().any(|edge| {
        edge.canvas_id == canvas_id
            && edge.source_node_id == input.source_node_id
            && edge.source_port_id == input.source_port_id
            && edge.target_node_id == input.target_node_id
            && edge.target_port_id == input.target_port_id
    }) {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "EDGE_ALREADY_EXISTS",
            "This edge already exists",
            false,
        ));
    }
    let edge = CanvasEdge {
        id: Uuid::new_v4(),
        canvas_id,
        source_node_id: input.source_node_id,
        source_port_id: input.source_port_id,
        target_node_id: input.target_node_id,
        target_port_id: input.target_port_id,
        kind: input.kind,
    };
    let previous = store.clone();
    store.edges.insert(edge.id, edge.clone());
    mark_canvas_dirty(&mut store, canvas_id)?;
    persist_candidate(&state, &mut store, previous)?;
    Ok((StatusCode::CREATED, Json(edge)))
}

async fn delete_edge(
    State(state): State<AppState>,
    Path(edge_id): Path<Uuid>,
) -> Result<StatusCode, HostError> {
    let mut store = state.inner.lock().unwrap();
    let edge = store
        .edges
        .get(&edge_id)
        .cloned()
        .ok_or_else(|| not_found_error("Connection was not found"))?;
    ensure_canvas_editable(&store, edge.canvas_id)?;
    let previous = store.clone();
    store.edges.remove(&edge_id);
    mark_canvas_dirty(&mut store, edge.canvas_id)?;
    persist_candidate(&state, &mut store, previous)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn create_port(
    State(state): State<AppState>,
    Path(node_id): Path<Uuid>,
    Json(input): Json<CreatePortInput>,
) -> Result<(StatusCode, Json<CanvasPort>), HostError> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err(invalid_input_error("Port name is required"));
    }
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    let Some(node) = store.nodes.get_mut(&node_id) else {
        return Err(not_found_error("Node was not found"));
    };
    if node.ports.iter().any(|port| port.name == name) {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "PORT_ALREADY_EXISTS",
            "A port with this name already exists on the node",
            false,
        ));
    }
    let port = CanvasPort {
        id: Uuid::new_v4(),
        node_id,
        name: name.to_string(),
        direction: input.direction,
        kind: input.kind,
    };
    let canvas_id = node.canvas_id;
    node.ports.push(port.clone());
    mark_canvas_dirty(&mut store, canvas_id)?;
    persist_candidate(&state, &mut store, previous)?;
    Ok((StatusCode::CREATED, Json(port)))
}

async fn rename_canvas(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<RenameInput>,
) -> Result<Json<Canvas>, HostError> {
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    let name = input.name.trim();
    if name.is_empty() {
        return Err(invalid_input_error("Canvas name is required"));
    }
    canvas.name = name.to_string();
    canvas.updated_at = now();
    let result = canvas.clone();
    persist_candidate(&state, &mut store, previous)?;
    Ok(Json(result))
}

async fn delete_canvas(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
) -> Result<StatusCode, HostError> {
    let mut store = state.inner.lock().unwrap();
    let canvas = store
        .canvases
        .get(&canvas_id)
        .cloned()
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    if store.runs.values().any(|run| {
        run.canvas_id == canvas_id
            && matches!(
                run.status,
                RunStatus::Running | RunStatus::WaitingInput | RunStatus::Queued
            )
    }) {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "CANVAS_HAS_ACTIVE_RUN",
            "Cannot delete a canvas while it has an active run",
            false,
        ));
    }
    let previous = store.clone();
    store.canvases.remove(&canvas_id);
    store.nodes.retain(|_, node| node.canvas_id != canvas_id);
    store.edges.retain(|_, edge| edge.canvas_id != canvas_id);
    store
        .revisions
        .retain(|_, revision| revision.canvas_id != canvas_id);
    store.runs.retain(|_, run| run.canvas_id != canvas_id);
    store
        .notifications
        .retain(|_, notification| notification.canvas_id != Some(canvas_id));
    store
        .run_idempotency
        .retain(|(stored_canvas_id, _), _| *stored_canvas_id != canvas_id);
    let _ = canvas;
    persist_candidate(&state, &mut store, previous)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn set_default_entrypoint(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<EntrypointInput>,
) -> Result<Json<Canvas>, HostError> {
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    let node_belongs_to_canvas = store
        .nodes
        .get(&input.node_id)
        .is_some_and(|node| node.canvas_id == canvas_id);
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    if !node_belongs_to_canvas {
        return Err(invalid_input_error(
            "The entrypoint node does not belong to this canvas",
        ));
    }
    canvas.default_entrypoint_node_id = Some(input.node_id);
    canvas.draft_revision = canvas.draft_revision.saturating_add(1);
    canvas.draft_dirty = true;
    canvas.updated_at = now();
    let result = canvas.clone();
    persist_candidate(&state, &mut store, previous)?;
    Ok(Json(result))
}

async fn save_revision(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<SaveRevisionInput>,
) -> Result<(StatusCode, Json<CanvasRevision>), HostError> {
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    let graph_json = graph_json_for_canvas(&store, canvas_id);
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    if let Some(expected) = input.expected_draft_revision
        && expected != canvas.draft_revision
    {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "DRAFT_REVISION_CONFLICT",
            "The requested draft revision is stale",
            false,
        ));
    }
    canvas.revision += 1;
    canvas.draft_dirty = false;
    canvas.updated_at = now();
    let revision = CanvasRevision {
        id: Uuid::new_v4(),
        canvas_id,
        revision: canvas.revision,
        created_at: now(),
        created_by: "user".to_string(),
        status: "debug".to_string(),
        content_digest: sha256_digest(&graph_json),
        graph_json,
    };
    store.revisions.insert(revision.id, revision.clone());
    persist_candidate(&state, &mut store, previous)?;
    Ok((StatusCode::CREATED, Json(revision)))
}

async fn list_runs(State(state): State<AppState>, Path(canvas_id): Path<Uuid>) -> Json<Vec<Run>> {
    Json(
        state
            .inner
            .lock()
            .unwrap()
            .runs
            .values()
            .filter(|run| run.canvas_id == canvas_id)
            .cloned()
            .collect(),
    )
}

fn schedule_run_execution(state: AppState, run_id: Uuid) {
    tokio::spawn(async move {
        tokio::task::yield_now().await;
        let mut store = state.inner.lock().unwrap();
        let previous = store.clone();
        let (canvas_id, advance) = {
            let Some(run) = store.runs.get(&run_id) else {
                return;
            };
            if !matches!(run.status, RunStatus::Running) {
                return;
            }
            (
                run.canvas_id,
                advance_host_execution(
                    &store,
                    run.canvas_id,
                    &run.completed_node_ids,
                    &run.port_values,
                ),
            )
        };
        let canvas_name = store
            .canvases
            .get(&canvas_id)
            .map(|canvas| canvas.name.clone())
            .unwrap_or_else(|| "Canvas".to_string());
        let (title, message, severity, canvas_status) = match advance {
            Ok(HostRunAdvance::Waiting {
                node_id,
                prompt,
                completed_node_ids,
                port_values,
            }) => {
                let Some(run) = store.runs.get_mut(&run_id) else {
                    return;
                };
                run.status = RunStatus::WaitingInput;
                run.current_node_id = Some(node_id);
                run.input_prompt = Some(prompt.clone());
                run.completed_node_ids = completed_node_ids;
                run.port_values = port_values;
                run.node_values.clear();
                (
                    "Run waiting for input".to_string(),
                    format!("{canvas_name} is waiting for a local input: {prompt}."),
                    "info".to_string(),
                    RunStatus::WaitingInput,
                )
            }
            Ok(HostRunAdvance::Succeeded {
                result,
                completed_node_ids,
                port_values,
            }) => {
                let Some(run) = store.runs.get_mut(&run_id) else {
                    return;
                };
                run.status = RunStatus::Succeeded;
                run.current_node_id = None;
                run.input_prompt = None;
                run.result = result.clone();
                run.completed_node_ids = completed_node_ids;
                run.port_values = port_values;
                run.node_values.clear();
                run.finished_at = Some(now());
                (
                    if result.is_some() {
                        "Output produced".to_string()
                    } else {
                        "Run completed".to_string()
                    },
                    if result.is_some() {
                        format!("{canvas_name} produced a structured result.")
                    } else {
                        format!("{canvas_name} completed its execution plan.")
                    },
                    "success".to_string(),
                    RunStatus::Succeeded,
                )
            }
            Err(reason) => {
                let Some(run) = store.runs.get_mut(&run_id) else {
                    return;
                };
                run.status = RunStatus::Failed;
                run.current_node_id = None;
                run.input_prompt = Some(reason.clone());
                run.finished_at = Some(now());
                (
                    "Run failed".to_string(),
                    format!("{canvas_name} failed during graph execution: {reason}."),
                    "error".to_string(),
                    RunStatus::Failed,
                )
            }
        };
        let Some(canvas) = store.canvases.get_mut(&canvas_id) else {
            *store = previous;
            return;
        };
        canvas.status = canvas_status;
        let notification = Notification {
            id: Uuid::new_v4(),
            title,
            message,
            severity,
            created_at: now(),
            run_id: Some(run_id),
            canvas_id: Some(canvas.id),
        };
        store.notifications.insert(notification.id, notification);
        if let Err(error) = state.persist(&store) {
            eprintln!("run completion persistence failed: {error}");
            *store = previous;
            drop(store);
            schedule_run_execution(state, run_id);
        }
    });
}

async fn submit_run_input(
    State(state): State<AppState>,
    Path(run_id): Path<Uuid>,
    Json(input): Json<SubmitRunInput>,
) -> Result<Json<Run>, HostError> {
    let value = input.value.trim();
    if value.is_empty() {
        return Err(invalid_input_error("A result value is required"));
    }
    let mut store = state.inner.lock().unwrap();
    let previous = store.clone();
    let waiting_node = {
        let run = store
            .runs
            .get(&run_id)
            .ok_or_else(|| not_found_error("Run was not found"))?;
        if !matches!(run.status, RunStatus::WaitingInput) {
            return Err(HostError::new(
                StatusCode::CONFLICT,
                "RUN_NOT_WAITING",
                "This run is not waiting for input",
                false,
            ));
        }
        run.current_node_id
            .map(|node_id| {
                let node = store
                    .nodes
                    .get(&node_id)
                    .ok_or_else(|| not_found_error("The waiting node was not found"))?;
                let output_port_id = primary_value_output_port_id(node).ok_or_else(|| {
                    HostError::new(
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "NODE_OUTPUT_REQUIRED",
                        "The waiting node has no data or resource output port",
                        false,
                    )
                })?;
                Ok((node_id, output_port_id))
            })
            .transpose()?
    };
    let canvas_id = {
        let run = store
            .runs
            .get_mut(&run_id)
            .ok_or_else(|| not_found_error("Run was not found"))?;
        if let Some((node_id, output_port_id)) = waiting_node {
            if !run.completed_node_ids.contains(&node_id) {
                run.completed_node_ids.push(node_id);
            }
            run.port_values
                .insert(output_port_id, RuntimeValue::text(value));
            run.node_values.clear();
        }
        run.status = RunStatus::Running;
        run.finished_at = None;
        run.result = None;
        run.current_node_id = None;
        run.input_prompt = None;
        run.canvas_id
    };
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    canvas.status = RunStatus::Running;
    persist_candidate(&state, &mut store, previous)?;
    let run = store
        .runs
        .get(&run_id)
        .cloned()
        .ok_or_else(|| not_found_error("Run was not found"))?;
    drop(store);
    schedule_run_execution(state, run_id);
    Ok(Json(run))
}

async fn start_run(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<StartRunInput>,
) -> Result<Json<Run>, HostError> {
    let mut store = state.inner.lock().unwrap();
    if input.idempotency_key.trim().is_empty() {
        return Err(HostError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "INVALID_INPUT",
            "idempotencyKey is required",
            false,
        ));
    }
    let normalized_entrypoint = normalize_start_entrypoint(canvas_id, &input)?;

    let key = (canvas_id, input.idempotency_key.trim().to_string());
    if let Some(run_id) = store.run_idempotency.get(&key).copied() {
        let run = store.runs.get(&run_id).ok_or_else(|| {
            HostError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Stored run could not be found",
                true,
            )
        })?;
        if run.revision != input.revision || normalized_entrypoint != "default" {
            return Err(HostError::new(
                StatusCode::CONFLICT,
                "DUPLICATE_COMMAND",
                "The idempotency key was already used with different run parameters",
                false,
            ));
        }
        return Ok(Json(run.clone()));
    }

    let previous = store.clone();
    let canvas = store
        .canvases
        .get(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    if canvas.default_entrypoint_node_id.is_none() {
        return Err(HostError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "ENTRYPOINT_REQUIRED",
            "This canvas has no manual entrypoint. Configure an entrypoint before running.",
            false,
        ));
    }
    if input.revision != canvas.revision {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "REVISION_CONFLICT",
            "The requested revision is stale",
            false,
        ));
    }
    if let Err(reason) = validate_canvas_graph(&store, canvas_id) {
        return Err(HostError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "GRAPH_INVALID",
            reason,
            false,
        ));
    }
    if matches!(canvas.status, RunStatus::Running | RunStatus::WaitingInput) {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "RUN_ALREADY_ACTIVE",
            "A run is already active or waiting for input on this canvas",
            true,
        ));
    }
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or_else(|| not_found_error("Canvas was not found"))?;
    canvas.status = RunStatus::Running;
    let run = Run {
        id: Uuid::new_v4(),
        canvas_id,
        revision: canvas.revision,
        status: RunStatus::Running,
        started_at: now(),
        finished_at: None,
        current_node_id: None,
        input_prompt: None,
        result: None,
        completed_node_ids: Vec::new(),
        port_values: HashMap::new(),
        node_values: HashMap::new(),
    };
    store.runs.insert(run.id, run.clone());
    store.run_idempotency.insert(key, run.id);
    persist_candidate(&state, &mut store, previous)?;
    schedule_run_execution(state.clone(), run.id);
    Ok(Json(run))
}

#[tokio::main]
async fn main() {
    let security = SecurityConfig::from_env().expect("configure local Host access");
    let watch_parent = parse_parent_watch(env::var("PONG_HOST_PARENT_WATCH").ok().as_deref())
        .expect("configure Host parent lifecycle");
    start_parent_watch(watch_parent);
    let database_path = env::var_os("PONG_HOST_DB")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("pong-host.sqlite3"));
    let _instance_lock = acquire_instance_lock(&database_path, watch_parent)
        .await
        .expect("acquire local Host instance lock");
    let (connection, store, snapshot_version) =
        open_database(database_path).expect("open pong-host database");
    let state = AppState {
        inner: Arc::new(Mutex::new(store)),
        db: Arc::new(Mutex::new(connection)),
        snapshot_version: Arc::new(Mutex::new(snapshot_version)),
    };
    let recovering_runs = {
        let store = state.inner.lock().unwrap();
        store
            .runs
            .values()
            .filter(|run| matches!(run.status, RunStatus::Running))
            .map(|run| run.id)
            .collect::<Vec<_>>()
    };
    for run_id in recovering_runs {
        schedule_run_execution(state.clone(), run_id);
    }
    let app = router(state, security);
    let listener = bind_host_listener(watch_parent).await.expect("bind host");
    println!("{HOST_READY_LINE}");
    io::stdout().flush().expect("flush Host startup handshake");
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            if let Err(error) = tokio::signal::ctrl_c().await {
                eprintln!("failed to listen for shutdown signal: {error}");
            }
        })
        .await
        .expect("serve host");
}

fn router(state: AppState, security: SecurityConfig) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(security.allowed_origin.clone())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::PUT,
            Method::DELETE,
        ])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);
    Router::new()
        .route("/api/health", get(health))
        .route("/api/snapshot", get(snapshot))
        .route("/api/events", get(events))
        .route(
            "/api/workspaces",
            get(list_workspaces).post(create_workspace),
        )
        .route(
            "/api/workspaces/{workspace_id}",
            patch(rename_workspace).delete(delete_workspace),
        )
        .route(
            "/api/workspaces/{workspace_id}/canvases",
            get(list_canvases).post(create_canvas),
        )
        .route("/api/canvases/{canvas_id}/nodes", post(create_node))
        .route(
            "/api/nodes/{node_id}",
            patch(update_node).delete(delete_node),
        )
        .route("/api/nodes/{node_id}/ports", post(create_port))
        .route("/api/canvases/{canvas_id}/edges", post(create_edge))
        .route("/api/edges/{edge_id}", delete(delete_edge))
        .route("/api/canvases/{canvas_id}/revisions", post(save_revision))
        .route(
            "/api/canvases/{canvas_id}",
            patch(rename_canvas).delete(delete_canvas),
        )
        .route(
            "/api/canvases/{canvas_id}/entrypoint",
            axum::routing::put(set_default_entrypoint),
        )
        .route(
            "/api/canvases/{canvas_id}/runs",
            get(list_runs).post(start_run),
        )
        .route("/api/runs/{run_id}/input", post(submit_run_input))
        .layer(middleware::from_fn_with_state(security, authenticate))
        .layer(cors)
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{Body, to_bytes},
        http::Request,
    };
    use tower::ServiceExt;

    const TEST_TOKEN: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const TEST_ORIGIN: &str = "http://127.0.0.1:4174";

    fn test_security() -> SecurityConfig {
        SecurityConfig::new(TEST_TOKEN.to_string(), TEST_ORIGIN).unwrap()
    }

    #[test]
    fn parent_watch_mode_is_explicit_and_closed() {
        assert!(!parse_parent_watch(None).unwrap());
        assert!(parse_parent_watch(Some("stdin-eof")).unwrap());
        assert!(parse_parent_watch(Some("pid")).is_err());
    }

    fn store_port_id(state: &AppState, node_id: Uuid, name: &str) -> Uuid {
        state
            .inner
            .lock()
            .unwrap()
            .nodes
            .get(&node_id)
            .and_then(|node| node.ports.iter().find(|port| port.name == name))
            .map(|port| port.id)
            .expect("test port exists")
    }

    #[test]
    fn text_output_reads_value_from_connected_text_input() {
        let canvas_id = Uuid::new_v4();
        let input_id = Uuid::new_v4();
        let output_id = Uuid::new_v4();
        let input_ports = default_ports(input_id, "input.text");
        let output_ports = default_ports(output_id, "output.text");
        let input_output_id = input_ports
            .iter()
            .find(|port| port.name == "Text")
            .unwrap()
            .id;
        let output_input_id = output_ports
            .iter()
            .find(|port| port.name == "Input")
            .unwrap()
            .id;
        let mut config = serde_json::Map::new();
        config.insert(
            "inputValue".to_string(),
            serde_json::Value::String("Hello World".to_string()),
        );
        let mut store = Store::default();
        store.nodes.insert(
            input_id,
            CanvasNode {
                id: input_id,
                canvas_id,
                name: "Text Input".to_string(),
                kind: "input.text".to_string(),
                ports: input_ports,
                config,
            },
        );
        store.nodes.insert(
            output_id,
            CanvasNode {
                id: output_id,
                canvas_id,
                name: "Text Output".to_string(),
                kind: "output.text".to_string(),
                ports: output_ports,
                config: serde_json::Map::new(),
            },
        );
        store.edges.insert(
            Uuid::new_v4(),
            CanvasEdge {
                id: Uuid::new_v4(),
                canvas_id,
                source_node_id: input_id,
                source_port_id: input_output_id,
                target_node_id: output_id,
                target_port_id: output_input_id,
                kind: PortKind::Data,
            },
        );

        assert!(resolve_text_output(&store, canvas_id, &HashMap::new()).is_err());
        let runtime_values =
            HashMap::from([(input_output_id, RuntimeValue::text("Runtime input"))]);
        assert_eq!(
            resolve_text_output(&store, canvas_id, &runtime_values)
                .unwrap()
                .as_deref(),
            Some("Runtime input")
        );
    }

    #[test]
    fn legacy_node_values_migrate_to_typed_output_ports() {
        let canvas_id = Uuid::new_v4();
        let node_id = Uuid::new_v4();
        let run_id = Uuid::new_v4();
        let node = CanvasNode {
            id: node_id,
            canvas_id,
            name: "Text Input".to_string(),
            kind: "input.text".to_string(),
            ports: default_ports(node_id, "input.text"),
            config: serde_json::Map::new(),
        };
        let text_port_id = output_port_id(&node, "Text").unwrap();
        let mut run_json = serde_json::json!({
            "id": run_id,
            "canvasId": canvas_id,
            "revision": 1,
            "status": "succeeded",
            "startedAt": now(),
            "finishedAt": now(),
            "completedNodeIds": [node_id],
            "nodeValues": {}
        });
        run_json["nodeValues"]
            .as_object_mut()
            .unwrap()
            .insert(node_id.to_string(), serde_json::json!("Legacy input"));
        let run: Run = serde_json::from_value(run_json).unwrap();
        let store = Store::from(Snapshot {
            snapshot_version: 1,
            workspaces: Vec::new(),
            canvases: Vec::new(),
            nodes: vec![node],
            edges: Vec::new(),
            revisions: Vec::new(),
            runs: vec![run],
            notifications: Vec::new(),
        });
        let migrated = store.runs.get(&run_id).unwrap();
        assert_eq!(
            migrated.port_values.get(&text_port_id),
            Some(&RuntimeValue::text("Legacy input"))
        );
        assert!(migrated.node_values.is_empty());

        let emitted = serde_json::to_value(Snapshot::from(&store)).unwrap();
        assert!(emitted["runs"][0].get("nodeValues").is_none());
        assert_eq!(
            emitted["runs"][0]["portValues"][text_port_id.to_string()]["type"],
            "text"
        );
    }

    #[test]
    fn workspace_scan_reads_only_a_bounded_file_inventory() {
        let root = std::env::temp_dir().join(format!("pong-host-scan-{}", Uuid::new_v4()));
        std::fs::create_dir_all(root.join("src")).unwrap();
        std::fs::create_dir_all(root.join("node_modules")).unwrap();
        std::fs::write(root.join("src").join("main.java"), "class Main {}").unwrap();
        std::fs::write(root.join("README.md"), "# Demo").unwrap();
        std::fs::write(root.join("node_modules").join("ignored.js"), "ignored").unwrap();

        let workspace_id = Uuid::new_v4();
        let canvas_id = Uuid::new_v4();
        let node_id = Uuid::new_v4();
        let mut store = Store::default();
        store.workspaces.insert(
            workspace_id,
            Workspace {
                id: workspace_id,
                name: "Scan Workspace".to_string(),
                path: root.to_string_lossy().to_string(),
                updated_at: now(),
            },
        );
        store.canvases.insert(
            canvas_id,
            Canvas {
                id: canvas_id,
                workspace_id,
                name: "Scan".to_string(),
                status: RunStatus::Idle,
                default_entrypoint_node_id: None,
                revision: 0,
                draft_revision: 0,
                draft_dirty: false,
                updated_at: now(),
            },
        );
        let mut config = serde_json::Map::new();
        config.insert("maxEntries".to_string(), serde_json::json!(20));
        config.insert("maxDepth".to_string(), serde_json::json!(4));
        store.nodes.insert(
            node_id,
            CanvasNode {
                id: node_id,
                canvas_id,
                name: "Workspace Scan".to_string(),
                kind: "workspace.scan".to_string(),
                ports: default_ports(node_id, "workspace.scan"),
                config,
            },
        );

        let result = resolve_workspace_scan(&store, canvas_id).unwrap().unwrap();
        let json: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(json["files"], 2);
        assert_eq!(json["directories"], 1);
        assert_eq!(json["truncated"], false);
        assert!(
            json["sampleFiles"]
                .as_array()
                .unwrap()
                .iter()
                .all(|item| !item.as_str().unwrap().contains("node_modules"))
        );

        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn project_analysis_reports_manifests_tests_entrypoints_and_runtime_request() {
        let root = std::env::temp_dir().join(format!("pong-host-analyze-{}", Uuid::new_v4()));
        std::fs::create_dir_all(root.join("src/main/java/com/example")).unwrap();
        std::fs::create_dir_all(root.join("src/test/java/com/example")).unwrap();
        std::fs::create_dir_all(root.join("target")).unwrap();
        std::fs::write(
            root.join("pom.xml"),
            "<project><groupId>com.example</groupId><artifactId>demo</artifactId><version>1.0</version></project>",
        )
        .unwrap();
        std::fs::write(
            root.join("src/main/java/com/example/DemoApplication.java"),
            "class DemoApplication {}",
        )
        .unwrap();
        std::fs::write(
            root.join("src/test/java/com/example/DemoTest.java"),
            "class DemoTest {}",
        )
        .unwrap();
        std::fs::write(root.join("target/ignored.js"), "ignored").unwrap();

        let workspace_id = Uuid::new_v4();
        let canvas_id = Uuid::new_v4();
        let input_id = Uuid::new_v4();
        let analyze_id = Uuid::new_v4();
        let input_ports = default_ports(input_id, "input.text");
        let analyze_ports = default_ports(analyze_id, "workspace.analyze");
        let input_text_port = input_ports
            .iter()
            .find(|port| port.name == "Text")
            .unwrap()
            .id;
        let analyze_request_port = analyze_ports
            .iter()
            .find(|port| port.name == "Request")
            .unwrap()
            .id;
        let analyze_report_port = analyze_ports
            .iter()
            .find(|port| port.name == "Report")
            .unwrap()
            .id;
        let mut store = Store::default();
        store.workspaces.insert(
            workspace_id,
            Workspace {
                id: workspace_id,
                name: "Backend".to_string(),
                path: root.to_string_lossy().to_string(),
                updated_at: now(),
            },
        );
        store.canvases.insert(
            canvas_id,
            Canvas {
                id: canvas_id,
                workspace_id,
                name: "Analyze".to_string(),
                status: RunStatus::Idle,
                default_entrypoint_node_id: Some(input_id),
                revision: 0,
                draft_revision: 0,
                draft_dirty: false,
                updated_at: now(),
            },
        );
        store.nodes.insert(
            input_id,
            CanvasNode {
                id: input_id,
                canvas_id,
                name: "Analysis request".to_string(),
                kind: "input.text".to_string(),
                ports: input_ports,
                config: serde_json::Map::new(),
            },
        );
        store.nodes.insert(
            analyze_id,
            CanvasNode {
                id: analyze_id,
                canvas_id,
                name: "Project Analyze".to_string(),
                kind: "workspace.analyze".to_string(),
                ports: analyze_ports,
                config: serde_json::Map::new(),
            },
        );
        let edge_id = Uuid::new_v4();
        store.edges.insert(
            edge_id,
            CanvasEdge {
                id: edge_id,
                canvas_id,
                source_node_id: input_id,
                source_port_id: input_text_port,
                target_node_id: analyze_id,
                target_port_id: analyze_request_port,
                kind: PortKind::Data,
            },
        );

        let values = HashMap::from([(
            input_text_port,
            RuntimeValue::text("Analyze the backend carefully"),
        )]);
        let result = resolve_project_analysis(&store, canvas_id, &values)
            .unwrap()
            .unwrap();
        let json: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(json["request"], "Analyze the backend carefully");
        assert_eq!(json["inventory"]["files"], 3);
        assert_eq!(json["inventory"]["testFiles"], 1);
        assert!(
            json["projectTypes"]
                .as_array()
                .unwrap()
                .iter()
                .any(|value| value == "Java / Maven")
        );
        assert!(
            json["likelyEntrypoints"]
                .as_array()
                .unwrap()
                .iter()
                .any(|value| value.as_str().unwrap().ends_with("DemoApplication.java"))
        );
        let plan = compile_host_execution_plan(&store, canvas_id).unwrap();
        assert_eq!(plan.entrypoint_node_id, input_id);
        assert_eq!(plan.node_order, vec![input_id, analyze_id]);
        match advance_host_execution(&store, canvas_id, &[], &HashMap::new()).unwrap() {
            HostRunAdvance::Waiting {
                node_id, prompt, ..
            } => {
                assert_eq!(node_id, input_id);
                assert!(prompt.contains("Analysis request"));
            }
            HostRunAdvance::Succeeded { .. } => panic!("empty input must pause the run"),
        }
        match advance_host_execution(&store, canvas_id, &[input_id], &values).unwrap() {
            HostRunAdvance::Succeeded {
                result,
                completed_node_ids,
                port_values,
            } => {
                assert_eq!(completed_node_ids, vec![input_id, analyze_id]);
                assert!(matches!(
                    port_values.get(&analyze_report_port),
                    Some(RuntimeValue::Json { .. })
                ));
                let result: serde_json::Value =
                    serde_json::from_str(result.as_deref().unwrap()).unwrap();
                assert_eq!(result["request"], "Analyze the backend carefully");
            }
            HostRunAdvance::Waiting { .. } => panic!("submitted input must resume the plan"),
        }

        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn instance_lock_is_exclusive_and_released_on_drop() {
        let directory = std::env::temp_dir().join(format!("pong-host-lock-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        let database = directory.join("host.sqlite3");
        let first = InstanceLock::acquire(&database).unwrap();
        assert!(InstanceLock::acquire(&database).is_err());
        drop(first);
        let second = InstanceLock::acquire(&database).unwrap();
        drop(second);
        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn instance_lock_is_scoped_to_the_database_path() {
        let directory = std::env::temp_dir().join(format!("pong-host-lock-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        let first = InstanceLock::acquire(&directory.join("first.sqlite3")).unwrap();
        let second = InstanceLock::acquire(&directory.join("second.sqlite3")).unwrap();
        drop((first, second));
        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn local_security_configuration_fails_closed() {
        assert!(SecurityConfig::new(TEST_TOKEN.to_string(), "http://tauri.localhost").is_ok());
        assert!(SecurityConfig::new("short".to_string(), TEST_ORIGIN).is_err());
        assert!(SecurityConfig::new(TEST_TOKEN.to_string(), "http://evil.invalid:4174").is_err());
        assert!(SecurityConfig::new(TEST_TOKEN.to_string(), "http://127.0.0.1:4174/path").is_err());
        assert!(SecurityConfig::new(TEST_TOKEN.to_string(), "https://127.0.0.1:4174").is_err());
    }

    fn wire_fixtures() -> serde_json::Value {
        serde_json::from_str(include_str!(
            "../../../packages/protocol-schema/test/fixtures/host-wire.json"
        ))
        .unwrap()
    }

    #[test]
    fn host_snapshot_matches_shared_wire_fixture() {
        let expected = wire_fixtures()["snapshot"].clone();
        let snapshot: Snapshot = serde_json::from_value(expected.clone()).unwrap();
        assert_eq!(serde_json::to_value(&snapshot).unwrap(), expected);
        let store = Store::from(snapshot);
        let mut rebuilt = Snapshot::from(&store);
        rebuilt.snapshot_version = 7;
        let rebuilt = serde_json::to_value(rebuilt).unwrap();
        for key in [
            "workspaces",
            "canvases",
            "nodes",
            "edges",
            "revisions",
            "runs",
            "notifications",
        ] {
            let mut expected_items = expected[key].as_array().unwrap().clone();
            let mut rebuilt_items = rebuilt[key].as_array().unwrap().clone();
            expected_items.sort_by_key(|item| item["id"].as_str().unwrap().to_string());
            rebuilt_items.sort_by_key(|item| item["id"].as_str().unwrap().to_string());
            assert_eq!(rebuilt_items, expected_items, "{key}");
        }
        assert_eq!(rebuilt["snapshotVersion"], expected["snapshotVersion"]);
    }

    #[test]
    fn host_event_error_and_request_match_shared_wire_fixtures() {
        let fixtures = wire_fixtures();
        let event = HostEvent {
            event_id: Uuid::parse_str(
                fixtures["eventBatch"]["events"][0]["eventId"]
                    .as_str()
                    .unwrap(),
            )
            .unwrap(),
            event_type: "projection.snapshot.updated",
            global_position: 7,
            snapshot_version: 7,
            occurred_at: "2026-09-24T08:00:00.000Z".to_string(),
        };
        let batch = EventBatch {
            events: vec![event],
            next_global_position: 7,
            snapshot_version: 7,
        };
        assert_eq!(serde_json::to_value(batch).unwrap(), fixtures["eventBatch"]);

        let error = HostError::new(
            StatusCode::CONFLICT,
            "REVISION_CONFLICT",
            "The requested revision is stale",
            false,
        );
        assert_eq!(serde_json::to_value(error.body).unwrap(), fixtures["error"]);

        let request: StartRunInput =
            serde_json::from_value(fixtures["startRunRequest"].clone()).unwrap();
        assert_eq!(request.revision, 2);
        assert_eq!(request.entrypoint.as_deref(), Some("default"));
        assert_eq!(request.entrypoint_id, None);
        assert_eq!(request.idempotency_key, "run-key-1");
        let mut extra = fixtures["startRunRequest"].clone();
        extra["canvasId"] = serde_json::json!("path-only");
        assert!(serde_json::from_value::<StartRunInput>(extra).is_err());
    }

    #[test]
    fn legacy_snapshot_defaults_draft_and_revision_content_fields() {
        let legacy = serde_json::json!({
            "snapshotVersion": 0,
            "workspaces": [],
            "canvases": [{
                "id": Uuid::new_v4(),
                "workspaceId": Uuid::new_v4(),
                "name": "Legacy",
                "status": "idle",
                "defaultEntrypointNodeId": null,
                "revision": 0,
                "updatedAt": now()
            }],
            "nodes": [],
            "revisions": [{
                "id": Uuid::new_v4(),
                "canvasId": Uuid::new_v4(),
                "revision": 1,
                "createdAt": now(),
                "createdBy": "user",
                "status": "debug"
            }],
            "runs": [],
            "notifications": []
        });
        let snapshot: Snapshot = serde_json::from_value(legacy).unwrap();
        assert_eq!(snapshot.canvases[0].draft_revision, 0);
        assert!(!snapshot.canvases[0].draft_dirty);
        assert_eq!(
            snapshot.revisions[0].content_digest,
            format!("sha256:{}", "0".repeat(64))
        );
        assert_eq!(
            snapshot.revisions[0].graph_json,
            r#"{"nodes":[],"edges":[]}"#
        );
    }

    #[test]
    fn graph_digest_is_stable_for_node_order() {
        let canvas_id = Uuid::new_v4();
        let first_id = Uuid::new_v4();
        let second_id = Uuid::new_v4();
        let first_edge_id = Uuid::new_v4();
        let second_edge_id = Uuid::new_v4();
        let node = |id| CanvasNode {
            id,
            canvas_id,
            name: "node".to_string(),
            kind: "agent.task".to_string(),
            ports: vec![],
            config: serde_json::Map::new(),
        };
        let mut left = Store::default();
        left.nodes.insert(first_id, node(first_id));
        left.nodes.insert(second_id, node(second_id));
        left.edges.insert(
            first_edge_id,
            CanvasEdge {
                id: first_edge_id,
                canvas_id,
                source_node_id: first_id,
                source_port_id: first_id,
                target_node_id: second_id,
                target_port_id: second_id,
                kind: PortKind::Data,
            },
        );
        left.edges.insert(
            second_edge_id,
            CanvasEdge {
                id: second_edge_id,
                canvas_id,
                source_node_id: second_id,
                source_port_id: second_id,
                target_node_id: first_id,
                target_port_id: first_id,
                kind: PortKind::Data,
            },
        );
        let mut right = Store::default();
        right.nodes.insert(second_id, node(second_id));
        right.nodes.insert(first_id, node(first_id));
        right.edges.insert(
            second_edge_id,
            CanvasEdge {
                id: second_edge_id,
                canvas_id,
                source_node_id: second_id,
                source_port_id: second_id,
                target_node_id: first_id,
                target_port_id: first_id,
                kind: PortKind::Data,
            },
        );
        right.edges.insert(
            first_edge_id,
            CanvasEdge {
                id: first_edge_id,
                canvas_id,
                source_node_id: first_id,
                source_port_id: first_id,
                target_node_id: second_id,
                target_port_id: second_id,
                kind: PortKind::Data,
            },
        );
        let left_json = graph_json_for_canvas(&left, canvas_id);
        let right_json = graph_json_for_canvas(&right, canvas_id);
        assert_eq!(left_json, right_json);
        assert_eq!(sha256_digest(&left_json), sha256_digest(&right_json));
    }

    #[tokio::test]
    async fn graph_commands_persist_nodes_edges_and_mark_draft_dirty() {
        let state = test_state(test_database());
        let workspace_id = Uuid::new_v4();
        let canvas_id = Uuid::new_v4();
        let start_id = Uuid::new_v4();
        {
            let mut store = state.inner.lock().unwrap();
            store.workspaces.insert(
                workspace_id,
                Workspace {
                    id: workspace_id,
                    name: "Workspace".to_string(),
                    path: "D:/Workspace".to_string(),
                    updated_at: now(),
                },
            );
            store.canvases.insert(
                canvas_id,
                Canvas {
                    id: canvas_id,
                    workspace_id,
                    name: "Canvas".to_string(),
                    status: RunStatus::Idle,
                    default_entrypoint_node_id: Some(start_id),
                    revision: 0,
                    draft_revision: 0,
                    draft_dirty: false,
                    updated_at: now(),
                },
            );
            store.nodes.insert(
                start_id,
                CanvasNode {
                    id: start_id,
                    canvas_id,
                    name: "Start".to_string(),
                    kind: "trigger.start".to_string(),
                    ports: default_ports(start_id, "trigger.start"),
                    config: serde_json::Map::new(),
                },
            );
        }

        let app = router(state.clone(), test_security());
        let node_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/nodes"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"name":"Review sources","kind":"task.manual"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(node_response.status(), StatusCode::CREATED);
        let node: CanvasNode = serde_json::from_slice(
            &to_bytes(node_response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();

        let edge_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/edges"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::json!({
                            "sourceNodeId": start_id,
                            "sourcePortId": store_port_id(&state, start_id, "Start"),
                            "targetNodeId": node.id,
                            "targetPortId": store_port_id(&state, node.id, "Start"),
                            "kind": "flow"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(edge_response.status(), StatusCode::CREATED);
        let edge: CanvasEdge = serde_json::from_slice(
            &to_bytes(edge_response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();

        let store = state.inner.lock().unwrap();
        let canvas = store.canvases.get(&canvas_id).unwrap();
        assert_eq!(canvas.draft_revision, 2);
        assert!(canvas.draft_dirty);
        assert_eq!(store.nodes.get(&node.id).unwrap().name, "Review sources");
        assert_eq!(store.edges.get(&edge.id).unwrap().target_node_id, node.id);
        let graph: serde_json::Value =
            serde_json::from_str(&graph_json_for_canvas(&store, canvas_id)).unwrap();
        assert_eq!(graph["nodes"].as_array().unwrap().len(), 2);
        assert_eq!(graph["edges"].as_array().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn graph_commands_delete_edges_and_nodes_safely() {
        let state = test_state(test_database());
        let canvas_id = Uuid::new_v4();
        let start_id = Uuid::new_v4();
        let node_id = Uuid::new_v4();
        let edge_id = Uuid::new_v4();
        let start_ports = default_ports(start_id, "trigger.start");
        let node_ports = default_ports(node_id, "task.manual");
        let start_output_id = start_ports
            .iter()
            .find(|port| port.name == "Start")
            .unwrap()
            .id;
        let node_input_id = node_ports
            .iter()
            .find(|port| port.name == "Start")
            .unwrap()
            .id;
        {
            let mut store = state.inner.lock().unwrap();
            store.canvases.insert(
                canvas_id,
                Canvas {
                    id: canvas_id,
                    workspace_id: Uuid::new_v4(),
                    name: "Canvas".to_string(),
                    status: RunStatus::Idle,
                    default_entrypoint_node_id: Some(start_id),
                    revision: 0,
                    draft_revision: 0,
                    draft_dirty: false,
                    updated_at: now(),
                },
            );
            store.nodes.insert(
                start_id,
                CanvasNode {
                    id: start_id,
                    canvas_id,
                    name: "Start".to_string(),
                    kind: "trigger.start".to_string(),
                    ports: start_ports,
                    config: serde_json::Map::new(),
                },
            );
            store.nodes.insert(
                node_id,
                CanvasNode {
                    id: node_id,
                    canvas_id,
                    name: "Review".to_string(),
                    kind: "task.manual".to_string(),
                    ports: node_ports,
                    config: serde_json::Map::new(),
                },
            );
            store.edges.insert(
                edge_id,
                CanvasEdge {
                    id: edge_id,
                    canvas_id,
                    source_node_id: start_id,
                    source_port_id: start_output_id,
                    target_node_id: node_id,
                    target_port_id: node_input_id,
                    kind: PortKind::Flow,
                },
            );
        }

        let app = router(state.clone(), test_security());
        let delete_default = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/nodes/{start_id}"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(delete_default.status(), StatusCode::NO_CONTENT);

        let delete_node = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri(format!("/api/nodes/{node_id}"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(delete_node.status(), StatusCode::NO_CONTENT);

        let store = state.inner.lock().unwrap();
        assert!(!store.nodes.contains_key(&start_id));
        assert!(!store.nodes.contains_key(&node_id));
        assert!(!store.edges.contains_key(&edge_id));
        let canvas = store.canvases.get(&canvas_id).unwrap();
        assert_eq!(canvas.default_entrypoint_node_id, None);
        assert_eq!(canvas.draft_revision, 2);
        assert!(canvas.draft_dirty);
    }

    #[tokio::test]
    async fn start_run_requires_manual_entrypoint_without_rejecting_empty_canvas_as_corrupt() {
        let state = test_state(test_database());
        let canvas_id = Uuid::new_v4();
        {
            let mut store = state.inner.lock().unwrap();
            store.canvases.insert(
                canvas_id,
                Canvas {
                    id: canvas_id,
                    workspace_id: Uuid::new_v4(),
                    name: "Library Canvas".to_string(),
                    status: RunStatus::Idle,
                    default_entrypoint_node_id: None,
                    revision: 0,
                    draft_revision: 0,
                    draft_dirty: false,
                    updated_at: now(),
                },
            );
        }

        let app = router(state, test_security());
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/runs"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"revision":0,"entrypoint":"default","idempotencyKey":"no-entry"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
        let body: serde_json::Value =
            serde_json::from_slice(&to_bytes(response.into_body(), usize::MAX).await.unwrap())
                .unwrap();
        assert_eq!(body["code"], "ENTRYPOINT_REQUIRED");
        assert_eq!(
            body["message"],
            "This canvas has no manual entrypoint. Configure an entrypoint before running."
        );
    }

    #[tokio::test]
    async fn start_run_accepts_named_default_entrypoint_id() {
        let state = test_state(test_database());
        let canvas_id = Uuid::new_v4();
        let start_id = Uuid::new_v4();
        {
            let mut store = state.inner.lock().unwrap();
            store.canvases.insert(
                canvas_id,
                Canvas {
                    id: canvas_id,
                    workspace_id: Uuid::new_v4(),
                    name: "Named entrypoint".to_string(),
                    status: RunStatus::Idle,
                    default_entrypoint_node_id: Some(start_id),
                    revision: 0,
                    draft_revision: 0,
                    draft_dirty: false,
                    updated_at: now(),
                },
            );
            store.nodes.insert(
                start_id,
                CanvasNode {
                    id: start_id,
                    canvas_id,
                    name: "Start".to_string(),
                    kind: "trigger.start".to_string(),
                    ports: default_ports(start_id, "trigger.start"),
                    config: serde_json::Map::new(),
                },
            );
        }

        let app = router(state, test_security());
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/runs"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::json!({
                            "revision": 0,
                            "entrypointId": format!("{canvas_id}:default"),
                            "idempotencyKey": "named-entrypoint"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let run: Run =
            serde_json::from_slice(&to_bytes(response.into_body(), usize::MAX).await.unwrap())
                .unwrap();
        assert_eq!(run.canvas_id, canvas_id);
        assert_eq!(run.revision, 0);
    }

    #[tokio::test]
    async fn http_run_waits_for_input_and_resumes_through_project_analysis() {
        let root = std::env::temp_dir().join(format!("pong-host-http-analysis-{}", Uuid::new_v4()));
        std::fs::create_dir_all(root.join("src/main/java")).unwrap();
        std::fs::write(
            root.join("pom.xml"),
            "<project><groupId>com.example</groupId><artifactId>http-demo</artifactId></project>",
        )
        .unwrap();
        std::fs::write(
            root.join("src/main/java/DemoApplication.java"),
            "class DemoApplication {}",
        )
        .unwrap();

        let state = test_state(test_database());
        let workspace_id = Uuid::new_v4();
        let canvas_id = Uuid::new_v4();
        let input_id = Uuid::new_v4();
        let analyze_id = Uuid::new_v4();
        let output_id = Uuid::new_v4();
        let input_ports = default_ports(input_id, "input.text");
        let analyze_ports = default_ports(analyze_id, "workspace.analyze");
        let output_ports = default_ports(output_id, "output.text");
        let input_text_port = input_ports
            .iter()
            .find(|port| port.name == "Text")
            .unwrap()
            .id;
        let analyze_request_port = analyze_ports
            .iter()
            .find(|port| port.name == "Request")
            .unwrap()
            .id;
        let analyze_report_port = analyze_ports
            .iter()
            .find(|port| port.name == "Report")
            .unwrap()
            .id;
        let output_input_port = output_ports
            .iter()
            .find(|port| port.name == "Input")
            .unwrap()
            .id;
        {
            let mut store = state.inner.lock().unwrap();
            store.workspaces.insert(
                workspace_id,
                Workspace {
                    id: workspace_id,
                    name: "HTTP Project".to_string(),
                    path: root.to_string_lossy().to_string(),
                    updated_at: now(),
                },
            );
            store.canvases.insert(
                canvas_id,
                Canvas {
                    id: canvas_id,
                    workspace_id,
                    name: "HTTP Analysis".to_string(),
                    status: RunStatus::Idle,
                    default_entrypoint_node_id: Some(input_id),
                    revision: 0,
                    draft_revision: 0,
                    draft_dirty: false,
                    updated_at: now(),
                },
            );
            for node in [
                CanvasNode {
                    id: input_id,
                    canvas_id,
                    name: "Analysis Request".to_string(),
                    kind: "input.text".to_string(),
                    ports: input_ports,
                    config: serde_json::Map::new(),
                },
                CanvasNode {
                    id: analyze_id,
                    canvas_id,
                    name: "Project Analyze".to_string(),
                    kind: "workspace.analyze".to_string(),
                    ports: analyze_ports,
                    config: serde_json::Map::new(),
                },
                CanvasNode {
                    id: output_id,
                    canvas_id,
                    name: "Analysis Report".to_string(),
                    kind: "output.text".to_string(),
                    ports: output_ports,
                    config: serde_json::Map::new(),
                },
            ] {
                store.nodes.insert(node.id, node);
            }
            for edge in [
                CanvasEdge {
                    id: Uuid::new_v4(),
                    canvas_id,
                    source_node_id: input_id,
                    source_port_id: input_text_port,
                    target_node_id: analyze_id,
                    target_port_id: analyze_request_port,
                    kind: PortKind::Data,
                },
                CanvasEdge {
                    id: Uuid::new_v4(),
                    canvas_id,
                    source_node_id: analyze_id,
                    source_port_id: analyze_report_port,
                    target_node_id: output_id,
                    target_port_id: output_input_port,
                    kind: PortKind::Data,
                },
            ] {
                store.edges.insert(edge.id, edge);
            }
        }

        let app = router(state.clone(), test_security());
        let start_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/runs"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::json!({
                            "revision": 0,
                            "entrypointId": format!("{canvas_id}:default"),
                            "idempotencyKey": "http-project-analysis"
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(start_response.status(), StatusCode::OK);
        let started: Run = serde_json::from_slice(
            &to_bytes(start_response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        for _ in 0..100 {
            if state
                .inner
                .lock()
                .unwrap()
                .runs
                .get(&started.id)
                .is_some_and(|run| matches!(run.status, RunStatus::WaitingInput))
            {
                break;
            }
            tokio::task::yield_now().await;
        }
        assert!(
            state
                .inner
                .lock()
                .unwrap()
                .runs
                .get(&started.id)
                .is_some_and(|run| matches!(run.status, RunStatus::WaitingInput))
        );

        let submit_response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/runs/{}/input", started.id))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(r#"{"value":"Analyze this backend carefully"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(submit_response.status(), StatusCode::OK);
        for _ in 0..100 {
            if state
                .inner
                .lock()
                .unwrap()
                .runs
                .get(&started.id)
                .is_some_and(|run| matches!(run.status, RunStatus::Succeeded))
            {
                break;
            }
            tokio::task::yield_now().await;
        }
        let result = state
            .inner
            .lock()
            .unwrap()
            .runs
            .get(&started.id)
            .and_then(|run| run.result.clone())
            .expect("analysis result");
        let result: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(result["request"], "Analyze this backend carefully");
        assert!(
            result["projectTypes"]
                .as_array()
                .unwrap()
                .iter()
                .any(|value| value == "Java / Maven")
        );

        std::fs::remove_dir_all(root).unwrap();
    }

    #[tokio::test]
    async fn graph_commands_reject_invalid_and_duplicate_edges() {
        let state = test_state(test_database());
        let canvas_id = Uuid::new_v4();
        let node_id = Uuid::new_v4();
        let second_node_id = Uuid::new_v4();
        let other_canvas_id = Uuid::new_v4();
        let other_node_id = Uuid::new_v4();
        {
            let mut store = state.inner.lock().unwrap();
            for (id, name) in [(canvas_id, "Canvas"), (other_canvas_id, "Other")] {
                store.canvases.insert(
                    id,
                    Canvas {
                        id,
                        workspace_id: Uuid::new_v4(),
                        name: name.to_string(),
                        status: RunStatus::Idle,
                        default_entrypoint_node_id: None,
                        revision: 0,
                        draft_revision: 0,
                        draft_dirty: false,
                        updated_at: now(),
                    },
                );
            }
            store.nodes.insert(
                node_id,
                CanvasNode {
                    id: node_id,
                    canvas_id,
                    name: "A".to_string(),
                    kind: "task.manual".to_string(),
                    ports: default_ports(node_id, "task.manual"),
                    config: serde_json::Map::new(),
                },
            );
            store.nodes.insert(
                second_node_id,
                CanvasNode {
                    id: second_node_id,
                    canvas_id,
                    name: "A2".to_string(),
                    kind: "task.manual".to_string(),
                    ports: default_ports(second_node_id, "task.manual"),
                    config: serde_json::Map::new(),
                },
            );
            store.nodes.insert(
                other_node_id,
                CanvasNode {
                    id: other_node_id,
                    canvas_id: other_canvas_id,
                    name: "B".to_string(),
                    kind: "task.manual".to_string(),
                    ports: default_ports(other_node_id, "task.manual"),
                    config: serde_json::Map::new(),
                },
            );
        }
        let app = router(state.clone(), test_security());
        let send_edge = |payload: serde_json::Value| {
            let app = app.clone();
            async move {
                app.oneshot(
                    Request::builder()
                        .method("POST")
                        .uri(format!("/api/canvases/{canvas_id}/edges"))
                        .header(header::HOST, HOST_AUTHORITY)
                        .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                        .header(header::CONTENT_TYPE, "application/json")
                        .body(Body::from(payload.to_string()))
                        .unwrap(),
                )
                .await
                .unwrap()
            }
        };

        assert_eq!(
            send_edge(serde_json::json!({
                "sourceNodeId": node_id,
                "targetNodeId": node_id
            }))
            .await
            .status(),
            StatusCode::UNPROCESSABLE_ENTITY
        );
        assert_eq!(
            send_edge(serde_json::json!({
                "sourceNodeId": node_id,
                "targetNodeId": other_node_id
            }))
            .await
            .status(),
            StatusCode::UNPROCESSABLE_ENTITY
        );
        let valid = serde_json::json!({
            "sourceNodeId": node_id,
            "sourcePortId": store_port_id(&state, node_id, "Result"),
            "targetNodeId": second_node_id,
            "targetPortId": store_port_id(&state, second_node_id, "Input"),
            "kind": "data"
        });
        assert_eq!(send_edge(valid.clone()).await.status(), StatusCode::CREATED);
        assert_eq!(send_edge(valid).await.status(), StatusCode::CONFLICT);

        let store = state.inner.lock().unwrap();
        let canvas = store.canvases.get(&canvas_id).unwrap();
        assert_eq!(canvas.draft_revision, 1);
        assert!(canvas.draft_dirty);
        assert_eq!(store.edges.len(), 1);
    }

    #[tokio::test]
    async fn save_revision_requires_current_draft_revision_and_freezes_digest() {
        let state = test_state(test_database());
        let canvas_id = Uuid::new_v4();
        let node_id = Uuid::new_v4();
        let task_id = Uuid::new_v4();
        let workspace_id = Uuid::new_v4();
        let canvas = Canvas {
            id: canvas_id,
            workspace_id,
            name: "Draft".to_string(),
            status: RunStatus::Idle,
            default_entrypoint_node_id: Some(node_id),
            revision: 0,
            draft_revision: 1,
            draft_dirty: true,
            updated_at: now(),
        };
        let node = CanvasNode {
            id: node_id,
            canvas_id,
            name: "Start".to_string(),
            kind: "trigger.start".to_string(),
            ports: vec![],
            config: serde_json::Map::new(),
        };
        {
            let mut store = state.inner.lock().unwrap();
            store.canvases.insert(canvas_id, canvas);
            store.nodes.insert(node_id, node);
            store.nodes.insert(
                task_id,
                CanvasNode {
                    id: task_id,
                    canvas_id,
                    name: "Task".to_string(),
                    kind: "task.manual".to_string(),
                    ports: vec![],
                    config: serde_json::Map::new(),
                },
            );
            let edge_id = Uuid::new_v4();
            store.edges.insert(
                edge_id,
                CanvasEdge {
                    id: edge_id,
                    canvas_id,
                    source_node_id: node_id,
                    source_port_id: node_id,
                    target_node_id: task_id,
                    target_port_id: task_id,
                    kind: PortKind::Flow,
                },
            );
        }
        let app = router(state.clone(), test_security());
        let stale = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/revisions"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(r#"{"expectedDraftRevision":0}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(stale.status(), StatusCode::CONFLICT);
        let body: serde_json::Value =
            serde_json::from_slice(&to_bytes(stale.into_body(), usize::MAX).await.unwrap())
                .unwrap();
        assert_eq!(body["code"], "DRAFT_REVISION_CONFLICT");

        let saved = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/revisions"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(r#"{"expectedDraftRevision":1}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(saved.status(), StatusCode::CREATED);
        let revision: CanvasRevision =
            serde_json::from_slice(&to_bytes(saved.into_body(), usize::MAX).await.unwrap())
                .unwrap();
        assert!(revision.content_digest.starts_with("sha256:"));
        assert!(revision.graph_json.contains("trigger.start"));
        assert!(revision.graph_json.contains("task.manual"));
        assert!(revision.graph_json.contains(&task_id.to_string()));
        assert_eq!(revision.content_digest, sha256_digest(&revision.graph_json));
        let state_snapshot = state.inner.lock().unwrap();
        let updated_canvas = state_snapshot.canvases.get(&canvas_id).unwrap();
        assert_eq!(updated_canvas.revision, 1);
        assert!(!updated_canvas.draft_dirty);
        assert_eq!(state_snapshot.revisions.len(), 1);
    }

    #[tokio::test]
    async fn http_snapshot_events_and_error_match_shared_wire_fixtures() {
        let fixtures = wire_fixtures();
        let snapshot: Snapshot = serde_json::from_value(fixtures["snapshot"].clone()).unwrap();
        let state = test_state(test_database());
        *state.inner.lock().unwrap() = Store::from(snapshot);
        *state.snapshot_version.lock().unwrap() = 7;
        state.db.lock().unwrap().execute(
            "INSERT INTO host_events (event_id, event_type, global_position, snapshot_version, occurred_at)
             VALUES (?1, 'projection.snapshot.updated', 7, 7, '2026-09-24T08:00:00.000Z')",
            params!["88888888-8888-4888-8888-888888888888"],
        ).unwrap();
        let app = router(state, test_security());

        let snapshot_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/snapshot")
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(snapshot_response.status(), StatusCode::OK);
        let snapshot_json: serde_json::Value = serde_json::from_slice(
            &to_bytes(snapshot_response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        for key in [
            "workspaces",
            "canvases",
            "nodes",
            "revisions",
            "runs",
            "notifications",
        ] {
            let mut actual = snapshot_json[key].as_array().unwrap().clone();
            let mut expected = fixtures["snapshot"][key].as_array().unwrap().clone();
            actual.sort_by_key(|item| item["id"].as_str().unwrap().to_string());
            expected.sort_by_key(|item| item["id"].as_str().unwrap().to_string());
            assert_eq!(actual, expected, "{key}");
        }
        assert_eq!(
            snapshot_json["snapshotVersion"],
            fixtures["snapshot"]["snapshotVersion"]
        );

        let events_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/events?afterGlobalPosition=0")
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(events_response.status(), StatusCode::OK);
        let events_json: serde_json::Value = serde_json::from_slice(
            &to_bytes(events_response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(events_json, fixtures["eventBatch"]);

        let canvas_id = fixtures["snapshot"]["canvases"][0]["id"].as_str().unwrap();
        let error_response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/canvases/{canvas_id}/runs"))
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        r#"{"revision":1,"entrypoint":"default","idempotencyKey":"stale"}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(error_response.status(), StatusCode::CONFLICT);
        let error_json: serde_json::Value = serde_json::from_slice(
            &to_bytes(error_response.into_body(), usize::MAX)
                .await
                .unwrap(),
        )
        .unwrap();
        assert_eq!(error_json, fixtures["error"]);
    }

    #[tokio::test]
    async fn local_host_rejects_unauthenticated_foreign_origin_and_wrong_authority() {
        let state = test_state(test_database());
        let app = router(state.clone(), test_security());
        for (host, origin, authorization, status, code) in [
            (
                HOST_AUTHORITY,
                Some(TEST_ORIGIN),
                None,
                StatusCode::UNAUTHORIZED,
                "AUTH_REQUIRED",
            ),
            (
                HOST_AUTHORITY,
                Some(TEST_ORIGIN),
                Some("Bearer wrong"),
                StatusCode::UNAUTHORIZED,
                "AUTH_REQUIRED",
            ),
            (
                HOST_AUTHORITY,
                Some("http://evil.invalid:4174"),
                Some(TEST_TOKEN),
                StatusCode::FORBIDDEN,
                "ORIGIN_FORBIDDEN",
            ),
            (
                HOST_AUTHORITY,
                Some("null"),
                Some(TEST_TOKEN),
                StatusCode::FORBIDDEN,
                "ORIGIN_FORBIDDEN",
            ),
            (
                "evil.invalid:4317",
                Some(TEST_ORIGIN),
                Some(TEST_TOKEN),
                StatusCode::FORBIDDEN,
                "HOST_FORBIDDEN",
            ),
        ] {
            let mut request = Request::builder()
                .method("POST")
                .uri("/api/workspaces")
                .header(header::HOST, host)
                .header(header::CONTENT_TYPE, "application/json");
            if let Some(origin) = origin {
                request = request.header(header::ORIGIN, origin);
            }
            if let Some(token) = authorization {
                let value = if token == TEST_TOKEN {
                    format!("Bearer {token}")
                } else {
                    token.to_string()
                };
                request = request.header(header::AUTHORIZATION, value);
            }
            let response = app
                .clone()
                .oneshot(
                    request
                        .body(Body::from(
                            r#"{"name":"Unauthorized","path":"D:/Research"}"#,
                        ))
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), status);
            let body: serde_json::Value =
                serde_json::from_slice(&to_bytes(response.into_body(), usize::MAX).await.unwrap())
                    .unwrap();
            assert_eq!(body["code"], code);
        }
        assert!(state.inner.lock().unwrap().workspaces.is_empty());

        let accepted = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/workspaces")
                    .header(header::HOST, HOST_AUTHORITY)
                    .header(header::ORIGIN, TEST_ORIGIN)
                    .header(header::AUTHORIZATION, format!("Bearer {TEST_TOKEN}"))
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(r#"{"name":"Research","path":"D:/Research"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(accepted.status(), StatusCode::CREATED);
        assert_eq!(
            accepted
                .headers()
                .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
                .unwrap(),
            TEST_ORIGIN
        );
        assert_eq!(state.inner.lock().unwrap().workspaces.len(), 1);

        for (origin, allowed) in [(TEST_ORIGIN, true), ("http://evil.invalid:4174", false)] {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(Method::OPTIONS)
                        .uri("/api/workspaces")
                        .header(header::HOST, HOST_AUTHORITY)
                        .header(header::ORIGIN, origin)
                        .header(header::ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(
                            header::ACCESS_CONTROL_REQUEST_HEADERS,
                            "authorization,content-type",
                        )
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(
                response
                    .headers()
                    .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
                    .is_some_and(|value| value == origin),
                allowed
            );
        }
    }

    fn test_database() -> Connection {
        open_database(PathBuf::from(":memory:")).unwrap().0
    }

    fn test_state(connection: Connection) -> AppState {
        AppState {
            inner: Arc::new(Mutex::new(Store::default())),
            db: Arc::new(Mutex::new(connection)),
            snapshot_version: Arc::new(Mutex::new(0)),
        }
    }

    fn temporary_database_path(label: &str) -> PathBuf {
        env::temp_dir().join(format!("seekwd-{label}-{}.sqlite3", Uuid::new_v4()))
    }

    fn remove_database_files(path: &PathBuf) {
        for suffix in ["", "-wal", "-shm", ".lock"] {
            let candidate = PathBuf::from(format!("{}{suffix}", path.display()));
            let _ = std::fs::remove_file(candidate);
        }
    }

    #[test]
    fn file_database_initializes_wal_version_pragmas_and_index() {
        let path = temporary_database_path("init");
        let (connection, _, _) = open_database(path.clone()).unwrap();

        assert_eq!(
            connection
                .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .unwrap(),
            CURRENT_DATABASE_VERSION
        );
        assert_eq!(
            connection
                .pragma_query_value(None, "journal_mode", |row| row.get::<_, String>(0))
                .unwrap()
                .to_ascii_lowercase(),
            "wal"
        );
        assert_eq!(
            connection
                .pragma_query_value(None, "foreign_keys", |row| row.get::<_, i64>(0))
                .unwrap(),
            1
        );
        assert!(
            database_object_exists(&connection, "index", "idx_host_events_snapshot_version")
                .unwrap()
        );
        drop(connection);
        remove_database_files(&path);
    }

    #[test]
    fn newer_schema_version_is_rejected_without_downgrade() {
        let path = temporary_database_path("newer");
        let connection = Connection::open(&path).unwrap();
        connection
            .pragma_update(None, "user_version", CURRENT_DATABASE_VERSION + 1)
            .unwrap();
        drop(connection);

        let error = open_database(path.clone()).err().unwrap();

        assert!(error.to_string().contains("newer than supported"));
        let connection = Connection::open(&path).unwrap();
        assert_eq!(
            connection
                .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .unwrap(),
            CURRENT_DATABASE_VERSION + 1
        );
        drop(connection);
        remove_database_files(&path);
    }

    #[test]
    fn partial_unversioned_database_is_rejected_without_initializing_remaining_tables() {
        let path = temporary_database_path("partial");
        let connection = Connection::open(&path).unwrap();
        connection
            .execute_batch(
                "CREATE TABLE host_state (id INTEGER PRIMARY KEY, snapshot_json TEXT NOT NULL);",
            )
            .unwrap();
        drop(connection);

        let error = open_database(path.clone()).err().unwrap();

        assert!(error.to_string().contains("partial schema"));
        let connection = Connection::open(&path).unwrap();
        assert!(!database_object_exists(&connection, "table", "command_journal").unwrap());
        assert_eq!(
            connection
                .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .unwrap(),
            0
        );
        drop(connection);
        remove_database_files(&path);
    }

    #[test]
    fn legacy_unversioned_database_migrates_preserving_rows_and_constraints() {
        let path = temporary_database_path("legacy");
        let connection = Connection::open(&path).unwrap();
        connection
            .execute_batch(
                "CREATE TABLE host_state (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot_json TEXT NOT NULL);
                 CREATE TABLE command_journal (
                   canvas_id TEXT NOT NULL,
                   idempotency_key TEXT NOT NULL,
                   run_id TEXT NOT NULL,
                   revision INTEGER NOT NULL,
                   entrypoint TEXT NOT NULL,
                   PRIMARY KEY (canvas_id, idempotency_key)
                 );
                 CREATE TABLE host_events (
                   global_position INTEGER PRIMARY KEY,
                   event_id TEXT NOT NULL UNIQUE,
                   event_type TEXT NOT NULL,
                   snapshot_version INTEGER NOT NULL,
                   occurred_at TEXT NOT NULL
                 );",
            )
            .unwrap();
        let canvas_id = Uuid::new_v4();
        let run_id = Uuid::new_v4();
        let mut run_store = Store::default();
        run_store.runs.insert(
            run_id,
            Run {
                id: run_id,
                canvas_id,
                revision: 0,
                status: RunStatus::Succeeded,
                started_at: now(),
                finished_at: Some(now()),
                current_node_id: None,
                input_prompt: None,
                result: None,
                completed_node_ids: Vec::new(),
                port_values: HashMap::new(),
                node_values: HashMap::new(),
            },
        );
        let mut snapshot = Snapshot::from(&run_store);
        snapshot.snapshot_version = 1;
        connection
            .execute(
                "INSERT INTO command_journal (canvas_id, idempotency_key, run_id, revision, entrypoint) VALUES (?1, 'key', ?2, 0, 'default')",
                params![canvas_id.to_string(), run_id.to_string()],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO host_events (global_position, event_id, event_type, snapshot_version, occurred_at) VALUES (1, 'event', 'projection.snapshot.updated', 1, 'now')",
                [],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO host_state (id, snapshot_json) VALUES (1, ?1)",
                params![serde_json::to_string(&snapshot).unwrap()],
            )
            .unwrap();
        drop(connection);

        let (connection, _, _) = open_database(path.clone()).unwrap();
        assert_eq!(
            connection
                .pragma_query_value(None, "user_version", |row| row.get::<_, i64>(0))
                .unwrap(),
            CURRENT_DATABASE_VERSION
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT COUNT(*) FROM command_journal WHERE idempotency_key = 'key'",
                    [],
                    |row| row.get::<_, i64>(0)
                )
                .unwrap(),
            1
        );
        assert_eq!(
            connection
                .query_row(
                    "SELECT COUNT(*) FROM host_events WHERE event_id = 'event'",
                    [],
                    |row| row.get::<_, i64>(0)
                )
                .unwrap(),
            1
        );
        assert!(connection
            .execute(
                "INSERT INTO command_journal (canvas_id, idempotency_key, run_id, revision, entrypoint) VALUES (?1, '', ?2, 0, 'default')",
                params![Uuid::new_v4().to_string(), Uuid::new_v4().to_string()],
            )
            .is_err());
        assert!(connection
            .execute(
                "INSERT INTO host_events (global_position, event_id, event_type, snapshot_version, occurred_at) VALUES (2, 'bad-event', 'unknown', 2, 'now')",
                [],
            )
            .is_err());
        drop(connection);
        remove_database_files(&path);
    }

    #[test]
    fn failed_persist_does_not_advance_snapshot_version() {
        let state = test_state(Connection::open_in_memory().unwrap());

        let result = state.persist(&Store::default());

        assert!(result.is_err());
        assert_eq!(*state.snapshot_version.lock().unwrap(), 0);
    }

    #[test]
    fn failed_candidate_persist_restores_store() {
        let state = test_state(Connection::open_in_memory().unwrap());
        let mut store = Store::default();
        let workspace = Workspace {
            id: Uuid::new_v4(),
            name: "before".to_string(),
            path: "D:/workspace".to_string(),
            updated_at: now(),
        };
        store.workspaces.insert(workspace.id, workspace.clone());
        let previous = store.clone();
        store.workspaces.get_mut(&workspace.id).unwrap().name = "after".to_string();

        let error = persist_candidate(&state, &mut store, previous.clone()).unwrap_err();

        assert_eq!(error.status, StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(error.body.code, "PERSISTENCE_FAILED");
        assert_eq!(store.workspaces.get(&workspace.id).unwrap().name, "before");
        assert_eq!(*state.snapshot_version.lock().unwrap(), 0);
    }

    #[test]
    fn empty_database_is_the_only_implicit_empty_store() {
        let connection = test_database();
        let (store, version) = load_persisted_state(&connection).unwrap();

        assert_eq!(version, 0);
        assert!(store.workspaces.is_empty());
    }

    #[test]
    fn invalid_snapshot_does_not_become_an_empty_store() {
        let connection = test_database();
        connection
            .execute(
                "INSERT INTO host_state (id, snapshot_json) VALUES (1, '{invalid')",
                [],
            )
            .unwrap();

        let error = load_persisted_state(&connection).err().unwrap();

        assert!(error.to_string().contains("Invalid Host snapshot"));
    }

    #[test]
    fn missing_snapshot_table_is_not_treated_as_an_empty_store() {
        let connection = test_database();
        connection.execute("DROP TABLE host_state", []).unwrap();

        assert!(load_persisted_state(&connection).is_err());
    }

    #[test]
    fn snapshot_and_event_cursor_must_agree() {
        let connection = test_database();
        let mut snapshot = Snapshot::from(&Store::default());
        snapshot.snapshot_version = 1;
        connection
            .execute(
                "INSERT INTO host_state (id, snapshot_json) VALUES (1, ?1)",
                params![serde_json::to_string(&snapshot).unwrap()],
            )
            .unwrap();

        let error = load_persisted_state(&connection).err().unwrap();

        assert!(error.to_string().contains("event cursor do not match"));
    }

    #[test]
    fn legacy_snapshot_without_event_cursor_still_recovers() {
        let connection = test_database();
        let mut legacy_snapshot = serde_json::to_value(Snapshot::from(&Store::default())).unwrap();
        legacy_snapshot
            .as_object_mut()
            .unwrap()
            .remove("snapshotVersion");
        connection
            .execute(
                "INSERT INTO host_state (id, snapshot_json) VALUES (1, ?1)",
                params![legacy_snapshot.to_string()],
            )
            .unwrap();

        let (_, version) = load_persisted_state(&connection).unwrap();

        assert_eq!(version, 0);
    }

    #[test]
    fn orphaned_command_journal_rejects_startup() {
        let connection = test_database();
        connection
            .execute(
                "INSERT INTO command_journal (canvas_id, idempotency_key, run_id, revision, entrypoint) VALUES (?1, 'key', ?2, 0, 'default')",
                params![Uuid::new_v4().to_string(), Uuid::new_v4().to_string()],
            )
            .unwrap();

        let error = load_persisted_state(&connection).err().unwrap();

        assert!(error.to_string().contains("missing Run"));
    }

    #[test]
    fn mismatched_command_journal_rejects_startup() {
        let state = test_state(test_database());
        let canvas_id = Uuid::new_v4();
        let run_id = Uuid::new_v4();
        let mut store = Store::default();
        store.runs.insert(
            run_id,
            Run {
                id: run_id,
                canvas_id,
                revision: 2,
                status: RunStatus::Succeeded,
                started_at: now(),
                finished_at: Some(now()),
                current_node_id: None,
                input_prompt: None,
                result: None,
                completed_node_ids: Vec::new(),
                port_values: HashMap::new(),
                node_values: HashMap::new(),
            },
        );
        state.persist(&store).unwrap();
        let connection = state.db.lock().unwrap();
        connection
            .execute(
                "INSERT INTO command_journal (canvas_id, idempotency_key, run_id, revision, entrypoint) VALUES (?1, 'key', ?2, 3, 'default')",
                params![canvas_id.to_string(), run_id.to_string()],
            )
            .unwrap();

        let error = load_persisted_state(&connection).err().unwrap();

        assert!(
            error
                .to_string()
                .contains("does not match its persisted Run")
        );
    }

    #[test]
    fn valid_snapshot_and_command_journal_recover_together() {
        let state = test_state(test_database());
        let canvas_id = Uuid::new_v4();
        let run_id = Uuid::new_v4();
        let mut store = Store::default();
        store.runs.insert(
            run_id,
            Run {
                id: run_id,
                canvas_id,
                revision: 2,
                status: RunStatus::Succeeded,
                started_at: now(),
                finished_at: Some(now()),
                current_node_id: None,
                input_prompt: None,
                result: None,
                completed_node_ids: Vec::new(),
                port_values: HashMap::new(),
                node_values: HashMap::new(),
            },
        );
        store
            .run_idempotency
            .insert((canvas_id, "run-key".to_string()), run_id);
        state.persist(&store).unwrap();

        let connection = state.db.lock().unwrap();
        let (restored, version) = load_persisted_state(&connection).unwrap();

        assert_eq!(version, 1);
        assert_eq!(
            restored
                .run_idempotency
                .get(&(canvas_id, "run-key".to_string())),
            Some(&run_id)
        );
    }
}
