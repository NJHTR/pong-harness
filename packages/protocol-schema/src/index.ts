export type {
  Canvas,
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

import type { StartRunRequest } from "./host-wire.generated";

export type Id = string;
export interface CreateWorkspaceInput { name: string; path: string; }
export interface CreateCanvasInput { workspaceId: Id; name: string; }
// canvasId is carried by the HTTP path, not by StartRunRequest's JSON body.
export interface StartRunInput extends StartRunRequest { canvasId: Id; }
export interface SetDefaultEntrypointInput { canvasId: Id; nodeId: Id; }
