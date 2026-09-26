export type {
  Canvas,
  CanvasEdge,
  CanvasPort,
  CanvasNode,
  CanvasRevision,
  HostError,
  HostEvent,
  HostEventBatch,
  HostSnapshot,
  Notification,
  Run,
  RunStatus,
  Workspace,
} from "./host-wire.generated";

import type { CanvasPort, SaveRevisionRequest, StartRunRequest, SubmitRunInputRequest, UpdateNodeRequest } from "./host-wire.generated";

export type Id = string;
export interface CreateWorkspaceInput { name: string; path: string; }
export interface CreateCanvasInput { workspaceId: Id; name: string; }
export interface CreateNodeInput { canvasId: Id; name: string; kind: string; }
export interface CreateEdgeInput { canvasId: Id; sourceNodeId: Id; sourcePortId: Id; targetNodeId: Id; targetPortId: Id; kind: CanvasPort["kind"]; }
export interface CreatePortInput { nodeId: Id; name: string; direction: CanvasPort["direction"]; kind: CanvasPort["kind"]; }
export interface UpdateNodeInput extends UpdateNodeRequest { nodeId: Id; }
// canvasId is carried by the HTTP path, not by StartRunRequest's JSON body.
export interface StartRunInput extends StartRunRequest { canvasId: Id; }
export interface SubmitRunInput extends SubmitRunInputRequest { runId: Id; }
export type SaveRevisionInput = SaveRevisionRequest;
export interface SetDefaultEntrypointInput { canvasId: Id; nodeId: Id; }
