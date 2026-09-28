/* Generated from host-wire.schema.json. Do not edit. */

/**
 * Current local Host HTTP slice only; not the complete domain contract.
 */
export type HostWire =
  | HostSnapshot
  | HostEventBatch
  | HostError
  | StartRunRequest
  | SubmitRunInputRequest
  | SaveRevisionRequest
  | CreateNodeRequest
  | CreateEdgeRequest
  | CreatePortRequest
  | UpdateNodeRequest;
export type RunStatus = "idle" | "queued" | "running" | "waiting_input" | "succeeded" | "failed";
export type RuntimeValue =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "boolean";
      value: boolean;
    }
  | {
      type: "json";
      value: unknown;
    }
  | {
      type: "artifact_ref";
      artifactId: string;
    }
  | {
      type: "resource_ref";
      resourceId: string;
    };
export type StartRunRequest = StartRunRequest1 & {
  revision: number;
  entrypoint?: "default";
  entrypointId?: string;
  idempotencyKey: string;
};
export type StartRunRequest1 =
  | {
      entrypoint: "default";
      [k: string]: unknown;
    }
  | {
      entrypointId: string;
      [k: string]: unknown;
    };

export interface HostSnapshot {
  snapshotVersion: number;
  workspaces: Workspace[];
  canvases: Canvas[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  revisions: CanvasRevision[];
  runs: Run[];
  notifications: Notification[];
}
export interface Workspace {
  id: string;
  name: string;
  path: string;
  updatedAt: string;
}
export interface Canvas {
  id: string;
  workspaceId: string;
  name: string;
  status: RunStatus;
  defaultEntrypointNodeId: string | null;
  revision: number;
  draftRevision: number;
  draftDirty: boolean;
  updatedAt: string;
}
export interface CanvasNode {
  id: string;
  canvasId: string;
  name: string;
  kind: string;
  ports: CanvasPort[];
  config?: {
    [k: string]: unknown;
  };
}
export interface CanvasPort {
  id: string;
  nodeId: string;
  name: string;
  direction: "input" | "output";
  kind: "data" | "flow" | "event" | "resource";
}
export interface CanvasEdge {
  id: string;
  canvasId: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  kind: "data" | "flow" | "event" | "resource";
}
export interface CanvasRevision {
  id: string;
  canvasId: string;
  revision: number;
  createdAt: string;
  createdBy: "user" | "agent";
  status: "validated" | "debug";
  contentDigest: string;
  graphJson: string;
}
export interface Run {
  id: string;
  canvasId: string;
  revision: number;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  currentNodeId?: string | null;
  inputPrompt?: string | null;
  result?: string | null;
  completedNodeIds?: string[];
  portValues?: {
    [k: string]: RuntimeValue;
  };
}
export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "error";
  createdAt: string;
  runId: string | null;
  canvasId: string | null;
}
export interface HostEventBatch {
  events: HostEvent[];
  nextGlobalPosition: number;
  snapshotVersion: number;
}
export interface HostEvent {
  eventId: string;
  eventType: "projection.snapshot.updated";
  globalPosition: number;
  snapshotVersion: number;
  occurredAt: string;
}
export interface HostError {
  code: string;
  message: string;
  retryable: boolean;
}
export interface SubmitRunInputRequest {
  value: string;
}
export interface SaveRevisionRequest {
  expectedDraftRevision?: number;
}
export interface CreateNodeRequest {
  name: string;
  kind: string;
}
export interface CreateEdgeRequest {
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  kind: "data" | "flow" | "event" | "resource";
}
export interface CreatePortRequest {
  name: string;
  direction: "input" | "output";
  kind: "data" | "flow" | "event" | "resource";
}
export interface UpdateNodeRequest {
  name?: string;
  config?: {
    [k: string]: unknown;
  };
}
