export type Id = string;
export type RunStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export interface Workspace { id: Id; name: string; path: string; updatedAt: string; }
export interface Canvas { id: Id; workspaceId: Id; name: string; status: RunStatus; defaultEntrypointNodeId: Id | null; revision: number; updatedAt: string; }
export interface CanvasNode { id: Id; canvasId: Id; name: string; kind: string; }
export interface CanvasRevision { id: Id; canvasId: Id; revision: number; createdAt: string; createdBy: "user" | "agent"; status: "validated" | "debug"; }
export interface Run { id: Id; canvasId: Id; revision: number; status: RunStatus; startedAt: string; finishedAt?: string; }
export interface Notification { id: Id; title: string; message: string; severity: "info" | "success" | "warning" | "error"; createdAt: string; runId?: Id; canvasId?: Id; }

export interface CreateWorkspaceInput { name: string; path: string; }
export interface CreateCanvasInput { workspaceId: Id; name: string; }
export interface StartRunInput { canvasId: Id; revision: number; entrypoint: "default"; idempotencyKey: string; }
export interface SetDefaultEntrypointInput { canvasId: Id; nodeId: Id; }

export interface HostSnapshot { snapshotVersion: number; workspaces: Workspace[]; canvases: Canvas[]; nodes: CanvasNode[]; revisions: CanvasRevision[]; runs: Run[]; notifications: Notification[]; }
export interface HostError { code: string; message: string; retryable: boolean; }
