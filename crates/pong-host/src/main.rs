use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, patch, post},
};
use pong_core::{Canvas, CanvasRevision, Notification, Run, RunStatus, Workspace};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Clone, Default)]
struct AppState {
    inner: Arc<Mutex<Store>>,
}

#[derive(Default)]
struct Store {
    workspaces: HashMap<Uuid, Workspace>,
    canvases: HashMap<Uuid, Canvas>,
    revisions: HashMap<Uuid, CanvasRevision>,
    runs: HashMap<Uuid, Run>,
    notifications: HashMap<Uuid, Notification>,
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    workspaces: Vec<Workspace>,
    canvases: Vec<Canvas>,
    revisions: Vec<CanvasRevision>,
    runs: Vec<Run>,
    notifications: Vec<Notification>,
}

fn now() -> String {
    chrono_like_now()
}
fn chrono_like_now() -> String {
    format!(
        "{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    )
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
    Json(Snapshot {
        workspaces: store.workspaces.values().cloned().collect(),
        canvases: store.canvases.values().cloned().collect(),
        revisions: store.revisions.values().cloned().collect(),
        runs: store.runs.values().cloned().collect(),
        notifications: store.notifications.values().cloned().collect(),
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
    state
        .inner
        .lock()
        .unwrap()
        .workspaces
        .insert(item.id, item.clone());
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
    Ok(Json(workspace.clone()))
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
    state
        .inner
        .lock()
        .unwrap()
        .canvases
        .insert(item.id, item.clone());
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
    Ok(Json(canvas.clone()))
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

async fn start_run(
    State(state): State<AppState>,
    Path(canvas_id): Path<Uuid>,
) -> Result<Json<Run>, StatusCode> {
    let mut store = state.inner.lock().unwrap();
    let canvas = store
        .canvases
        .get_mut(&canvas_id)
        .ok_or(StatusCode::NOT_FOUND)?;
    if canvas.default_entrypoint_node_id.is_none() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
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
    let state_for_completion = state.clone();
    let run_id = run.id;
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(1600)).await;
        let mut store = state_for_completion.inner.lock().unwrap();
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
    });
    Ok(Json(run))
}

#[tokio::main]
async fn main() {
    let state = AppState::default();
    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/snapshot", get(snapshot))
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
