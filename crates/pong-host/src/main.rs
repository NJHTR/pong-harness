use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use pong_core::{Canvas, Run, RunStatus, Workspace};
use serde::Deserialize;
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
    runs: HashMap<Uuid, Run>,
}

#[derive(Deserialize)]
struct CreateWorkspace {
    name: String,
    path: String,
}

#[derive(Deserialize)]
struct CreateCanvas {
    workspace_id: Uuid,
    name: String,
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
    Ok(Json(run))
}

#[tokio::main]
async fn main() {
    let state = AppState::default();
    let app = Router::new()
        .route(
            "/api/workspaces",
            get(list_workspaces).post(create_workspace),
        )
        .route(
            "/api/workspaces/:workspace_id/canvases",
            get(list_canvases).post(create_canvas),
        )
        .route("/api/canvases/:canvas_id/runs", post(start_run))
        .layer(CorsLayer::permissive())
        .with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:4317")
        .await
        .expect("bind host");
    println!("pong-host listening on http://127.0.0.1:4317");
    axum::serve(listener, app).await.expect("serve host");
}
