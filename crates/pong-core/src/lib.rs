use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type Id = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: Id,
    pub name: String,
    pub path: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Canvas {
    pub id: Id,
    pub workspace_id: Id,
    pub name: String,
    pub status: RunStatus,
    pub default_entrypoint_node_id: Option<Id>,
    pub revision: u64,
    #[serde(default)]
    pub draft_revision: u64,
    #[serde(default)]
    pub draft_dirty: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasNode {
    pub id: Id,
    pub canvas_id: Id,
    pub name: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Idle,
    Queued,
    Running,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Run {
    pub id: Id,
    pub canvas_id: Id,
    pub revision: u64,
    pub status: RunStatus,
    pub started_at: String,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasRevision {
    pub id: Id,
    pub canvas_id: Id,
    pub revision: u64,
    pub created_at: String,
    pub created_by: String,
    pub status: String,
    #[serde(default = "legacy_digest")]
    pub content_digest: String,
    #[serde(default = "legacy_graph")]
    pub graph_json: String,
}

fn legacy_digest() -> String {
    "sha256:".to_string() + &"0".repeat(64)
}

fn legacy_graph() -> String {
    r#"{"nodes":[],"edges":[]}"#.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: Id,
    pub title: String,
    pub message: String,
    pub severity: String,
    pub created_at: String,
    pub run_id: Option<Id>,
    pub canvas_id: Option<Id>,
}
