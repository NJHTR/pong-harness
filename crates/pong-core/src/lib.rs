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
    #[serde(default)]
    pub ports: Vec<CanvasPort>,
    #[serde(default, skip_serializing_if = "serde_json::Map::is_empty")]
    pub config: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasPort {
    pub id: Id,
    pub node_id: Id,
    pub name: String,
    pub direction: PortDirection,
    pub kind: PortKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PortDirection {
    Input,
    Output,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum PortKind {
    #[default]
    Data,
    Flow,
    Event,
    Resource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasEdge {
    pub id: Id,
    pub canvas_id: Id,
    pub source_node_id: Id,
    #[serde(default)]
    pub source_port_id: Id,
    pub target_node_id: Id,
    #[serde(default)]
    pub target_port_id: Id,
    #[serde(default)]
    pub kind: PortKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Idle,
    Queued,
    Running,
    WaitingInput,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum RuntimeValue {
    Text {
        value: String,
    },
    Number {
        value: f64,
    },
    Boolean {
        value: bool,
    },
    Json {
        value: serde_json::Value,
    },
    ArtifactRef {
        #[serde(rename = "artifactId")]
        artifact_id: Id,
    },
    ResourceRef {
        #[serde(rename = "resourceId")]
        resource_id: Id,
    },
}

impl RuntimeValue {
    pub fn text(value: impl Into<String>) -> Self {
        Self::Text {
            value: value.into(),
        }
    }

    pub fn as_text(&self) -> Option<&str> {
        match self {
            Self::Text { value } => Some(value),
            _ => None,
        }
    }
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current_node_id: Option<Id>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_prompt: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub completed_node_ids: Vec<Id>,
    #[serde(default, skip_serializing_if = "std::collections::HashMap::is_empty")]
    pub port_values: std::collections::HashMap<Id, RuntimeValue>,
    #[serde(default, rename = "nodeValues", skip_serializing)]
    pub node_values: std::collections::HashMap<Id, String>,
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
