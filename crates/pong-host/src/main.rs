use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, patch, post},
};
use pong_core::{Canvas, CanvasNode, CanvasRevision, Notification, Run, RunStatus, Workspace};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    env,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    inner: Arc<Mutex<Store>>,
    db: Arc<Mutex<Connection>>,
    snapshot_version: Arc<Mutex<u64>>,
}

#[derive(Default)]
struct Store {
    workspaces: HashMap<Uuid, Workspace>,
    canvases: HashMap<Uuid, Canvas>,
    nodes: HashMap<Uuid, CanvasNode>,
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
struct RenameInput {
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntrypointInput {
    node_id: Uuid,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartRunInput {
    revision: u64,
    entrypoint: String,
    idempotency_key: String,
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

impl From<Snapshot> for Store {
    fn from(snapshot: Snapshot) -> Self {
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
            nodes: snapshot
                .nodes
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
            revisions: snapshot
                .revisions
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
            runs: snapshot
                .runs
                .into_iter()
                .map(|item| (item.id, item))
                .collect(),
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
        *version = version.saturating_add(1);
        snapshot.snapshot_version = *version;
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
            params![*version as i64, Uuid::new_v4().to_string(), "projection.snapshot.updated", *version as i64, now()],
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
        transaction.commit()
    }
}

fn open_database(path: PathBuf) -> rusqlite::Result<(Connection, Store, u64)> {
    let connection = Connection::open(path)?;
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS host_state (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot_json TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS command_journal (
           canvas_id TEXT NOT NULL,
           idempotency_key TEXT NOT NULL,
           run_id TEXT NOT NULL,
           revision INTEGER NOT NULL,
           entrypoint TEXT NOT NULL,
           PRIMARY KEY (canvas_id, idempotency_key)
         );
         CREATE TABLE IF NOT EXISTS host_events (
           global_position INTEGER PRIMARY KEY,
           event_id TEXT NOT NULL UNIQUE,
           event_type TEXT NOT NULL,
           snapshot_version INTEGER NOT NULL,
           occurred_at TEXT NOT NULL
         );",
    )?;
    let loaded_snapshot = connection
        .query_row(
            "SELECT snapshot_json FROM host_state WHERE id = 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .ok()
        .and_then(|json| serde_json::from_str::<Snapshot>(&json).ok());
    let snapshot_version = loaded_snapshot
        .as_ref()
        .map(|snapshot| snapshot.snapshot_version)
        .unwrap_or_default();
    let mut store = loaded_snapshot.map(Store::from).unwrap_or_default();
    let mut statement =
        connection.prepare("SELECT canvas_id, idempotency_key, run_id FROM command_journal")?;
    let rows = statement.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    })?;
    for row in rows.flatten() {
        if let (Ok(canvas_id), Ok(run_id)) = (Uuid::parse_str(&row.0), Uuid::parse_str(&row.2)) {
            store.run_idempotency.insert((canvas_id, row.1), run_id);
        }
    }
    drop(statement);
    Ok((connection, store, snapshot_version))
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
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
) -> Json<EventBatch> {
    let limit = query.limit.clamp(1, 500);
    let connection = state.db.lock().unwrap();
    let mut statement = connection
        .prepare(
            "SELECT event_id, event_type, global_position, snapshot_version, occurred_at
             FROM host_events WHERE global_position > ?1
             ORDER BY global_position ASC LIMIT ?2",
        )
        .expect("prepare host event query");
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
        .expect("read host events");
    let events: Vec<HostEvent> = rows.flatten().collect();
    let next_global_position = events
        .last()
        .map(|event| event.global_position)
        .unwrap_or(query.after_global_position);
    let snapshot_version = *state.snapshot_version.lock().unwrap();
    Json(EventBatch {
        events,
        next_global_position,
        snapshot_version,
    })
}

async fn create_workspace(
    State(state): State<AppState>,
    Json(input): Json<CreateWorkspace>,
) -> (StatusCode, Json<Workspace>) {
    let item = Workspace {
        id: Uuid::new_v4(),
        name: input.name.trim().to_string(),
        path: input.path,
        updated_at: now(),
    };
    let mut store = state.inner.lock().unwrap();
    store.workspaces.insert(item.id, item.clone());
    let _ = state.persist(&store);
    (StatusCode::CREATED, Json(item))
}

async fn rename_workspace(
    State(state): State<AppState>,
    Path(workspace_id): Path<Uuid>,
    Json(input): Json<RenameInput>,
) -> Result<Json<Workspace>, StatusCode> {
    let mut store = state.inner.lock().unwrap();
    let workspace = store
        .workspaces
        .get_mut(&workspace_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    let name = input.name.trim();
    if name.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    workspace.name = name.to_string();
    workspace.updated_at = now();
    let result = workspace.clone();
    let _ = state.persist(&store);
    Ok(Json(result))
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

async fn create_canvas(
    State(state): State<AppState>,
    Json(input): Json<CreateCanvas>,
) -> (StatusCode, Json<Canvas>) {
    let item = Canvas {
        id: Uuid::new_v4(),
        workspace_id: input.workspace_id,
        name: input.name.trim().to_string(),
        status: RunStatus::Idle,
        default_entrypoint_node_id: None,
        revision: 0,
        updated_at: now(),
    };
    let start_node = CanvasNode {
        id: Uuid::new_v4(),
        canvas_id: item.id,
        name: "Start".to_string(),
        kind: "trigger.start".to_string(),
    };
    let mut item = item;
    item.default_entrypoint_node_id = Some(start_node.id);
    let mut store = state.inner.lock().unwrap();
    store.canvases.insert(item.id, item.clone());
    store.nodes.insert(start_node.id, start_node);
    let _ = state.persist(&store);
    (StatusCode::CREATED, Json(item))
}

async fn rename_canvas(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<RenameInput>,
) -> Result<Json<Canvas>, StatusCode> {
    let mut store = state.inner.lock().unwrap();
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    let name = input.name.trim();
    if name.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    canvas.name = name.to_string();
    canvas.updated_at = now();
    let result = canvas.clone();
    let _ = state.persist(&store);
    Ok(Json(result))
}

async fn set_default_entrypoint(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
    Json(input): Json<EntrypointInput>,
) -> Result<Json<Canvas>, StatusCode> {
    let mut store = state.inner.lock().unwrap();
    let node_belongs_to_canvas = store
        .nodes
        .get(&input.node_id)
        .is_some_and(|node| node.canvas_id == canvas_id);
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    if !node_belongs_to_canvas {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    canvas.default_entrypoint_node_id = Some(input.node_id);
    canvas.updated_at = now();
    let result = canvas.clone();
    let _ = state.persist(&store);
    Ok(Json(result))
}

async fn save_revision(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
) -> Result<(StatusCode, Json<CanvasRevision>), StatusCode> {
    let mut store = state.inner.lock().unwrap();
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    canvas.revision += 1;
    canvas.updated_at = now();
    let revision = CanvasRevision {
        id: Uuid::new_v4(),
        canvas_id,
        revision: canvas.revision,
        created_at: now(),
        created_by: "user".to_string(),
        status: "debug".to_string(),
    };
    store.revisions.insert(revision.id, revision.clone());
    let _ = state.persist(&store);
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

fn remaining_run_delay(run: &Run) -> std::time::Duration {
    let total = chrono::Duration::milliseconds(1600);
    let Ok(started_at) = chrono::DateTime::parse_from_rfc3339(&run.started_at) else {
        return std::time::Duration::from_millis(1600);
    };
    let elapsed = chrono::Utc::now().signed_duration_since(started_at.with_timezone(&chrono::Utc));
    let remaining = (total - elapsed).max(chrono::Duration::zero());
    std::time::Duration::from_millis(remaining.num_milliseconds() as u64)
}

fn schedule_run_completion(state: AppState, run_id: Uuid, delay: std::time::Duration) {
    tokio::spawn(async move {
        tokio::time::sleep(delay).await;
        let mut store = state.inner.lock().unwrap();
        let (canvas_id, completed_run_id) = {
            let Some(run) = store.runs.get_mut(&run_id) else {
                return;
            };
            if !matches!(run.status, RunStatus::Running) {
                return;
            }
            let canvas_id = run.canvas_id;
            run.status = RunStatus::Succeeded;
            run.finished_at = Some(now());
            (canvas_id, run.id)
        };
        let Some(canvas) = store.canvases.get_mut(&canvas_id) else {
            return;
        };
        canvas.status = RunStatus::Succeeded;
        let notification = Notification {
            id: Uuid::new_v4(),
            title: "Run completed".to_string(),
            message: format!("{} completed successfully.", canvas.name),
            severity: "success".to_string(),
            created_at: now(),
            run_id: Some(completed_run_id),
            canvas_id: Some(canvas.id),
        };
        store.notifications.insert(notification.id, notification);
        let _ = state.persist(&store);
    });
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
        if run.revision != input.revision || input.entrypoint != "default" {
            return Err(HostError::new(
                StatusCode::CONFLICT,
                "DUPLICATE_COMMAND",
                "The idempotency key was already used with different run parameters",
                false,
            ));
        }
        return Ok(Json(run.clone()));
    }

    let canvas = store.canvases.get_mut(&canvas_id).ok_or_else(|| {
        HostError::new(
            StatusCode::NOT_FOUND,
            "NOT_FOUND",
            "Canvas was not found",
            false,
        )
    })?;
    if input.entrypoint != "default" {
        return Err(HostError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "INVALID_INPUT",
            "Only the default entrypoint is supported",
            false,
        ));
    }
    if canvas.default_entrypoint_node_id.is_none() {
        return Err(HostError::new(
            StatusCode::UNPROCESSABLE_ENTITY,
            "ENTRYPOINT_REQUIRED",
            "A default entrypoint is required",
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
    if matches!(canvas.status, RunStatus::Running) {
        return Err(HostError::new(
            StatusCode::CONFLICT,
            "RUN_ALREADY_ACTIVE",
            "A run is already active for this canvas",
            true,
        ));
    }
    canvas.status = RunStatus::Running;
    let run = Run {
        id: Uuid::new_v4(),
        canvas_id,
        revision: canvas.revision,
        status: RunStatus::Running,
        started_at: now(),
        finished_at: None,
    };
    store.runs.insert(run.id, run.clone());
    store.run_idempotency.insert(key, run.id);
    let _ = state.persist(&store);
    schedule_run_completion(state.clone(), run.id, remaining_run_delay(&run));
    Ok(Json(run))
}

#[tokio::main]
async fn main() {
    let database_path = env::var_os("PONG_HOST_DB")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("pong-host.sqlite3"));
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
            .map(|run| (run.id, remaining_run_delay(run)))
            .collect::<Vec<_>>()
    };
    for (run_id, delay) in recovering_runs {
        schedule_run_completion(state.clone(), run_id, delay);
    }
    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/snapshot", get(snapshot))
        .route("/api/events", get(events))
        .route(
            "/api/workspaces",
            get(list_workspaces).post(create_workspace),
        )
        .route("/api/workspaces/{workspace_id}", patch(rename_workspace))
        .route(
            "/api/workspaces/{workspace_id}/canvases",
            get(list_canvases).post(create_canvas),
        )
        .route("/api/canvases/{canvas_id}/revisions", post(save_revision))
        .route("/api/canvases/{canvas_id}", patch(rename_canvas))
        .route(
            "/api/canvases/{canvas_id}/entrypoint",
            axum::routing::put(set_default_entrypoint),
        )
        .route(
            "/api/canvases/{canvas_id}/runs",
            get(list_runs).post(start_run),
        )
        .layer(CorsLayer::permissive())
        .with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:4317")
        .await
        .expect("bind host");
    println!("pong-host listening on http://127.0.0.1:4317");
    axum::serve(listener, app).await.expect("serve host");
}
