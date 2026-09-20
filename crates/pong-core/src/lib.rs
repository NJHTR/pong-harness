use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type Id = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: Id,
    pub name: String,
    pub path: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Canvas {
    pub id: Id,
    pub workspace_id: Id,
    pub name: String,
    pub status: RunStatus,
    pub default_entrypoint_node_id: Option<Id>,
    pub revision: u64,
    pub updated_at: String,
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
pub struct Run {
    pub id: Id,
    pub canvas_id: Id,
    pub revision: u64,
    pub status: RunStatus,
    pub started_at: String,
    pub finished_at: Option<String>,
}
