/* Generated from host-wire.schema.json. Do not edit. */

/**
 * Current local Host HTTP slice only; not the complete domain contract.
 */
export type HostWire = HostSnapshot | HostEventBatch | HostError | StartRunRequest;
export type RunStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export interface HostSnapshot {
  snapshotVersion: number;
  workspaces: Workspace[];
  canvases: Canvas[];
  nodes: CanvasNode[];
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
  updatedAt: string;
}
export interface CanvasNode {
  id: string;
  canvasId: string;
  name: string;
  kind: string;
}
export interface CanvasRevision {
  id: string;
  canvasId: string;
  revision: number;
  createdAt: string;
  createdBy: "user" | "agent";
  status: "validated" | "debug";
}
export interface Run {
  id: string;
  canvasId: string;
  revision: number;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
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
export interface StartRunRequest {
  revision: number;
  entrypoint: "default";
  idempotencyKey: string;
}
