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

export {
  validateConnection,
  type CanvasKind,
  type ConnectionValidation,
  type EntrypointKind,
  type GraphCanvas,
  type GraphEdge,
  type GraphEdgeKind,
  type GraphEntrypoint,
  type GraphId,
  type GraphNode,
  type GraphPort,
  type GraphPosition,
  type NodeCategory,
  type PortCardinality,
  type PortDirection,
  type PortValueType,
} from "./graph";

export type {
  CanvasDraft,
  CanvasEntrypoint,
  CanvasIdentity,
  CanvasKind as RuntimeCanvasKind,
  CanvasLifecycle,
  CanvasRelease,
  CanvasRevision as RuntimeCanvasRevision,
  DefinitionRef,
  Edge,
  EdgeKind,
  EntrypointKind as RuntimeEntrypointKind,
  GraphDocument,
  GraphPort as RuntimeGraphPort,
  GraphValidation,
  MappingExpression,
  NodeCategory as RuntimeNodeCategory,
  NodeInstance,
  NodeRunStatus,
  PortCardinality as RuntimePortCardinality,
  PortDirection as RuntimePortDirection,
  PortKind,
  PortValueType as RuntimePortValueType,
  Position,
  ReleaseChannel,
  ReleaseLifecycle,
  RevisionValidationStatus,
  Run as RuntimeRun,
  RunSnapshot,
  RunStatus as RuntimeRunStatus,
  SemVer,
  Timestamp,
  TriggerBinding,
} from "./runtime";
export { validateGraph as validateRuntimeGraph, validateConnection as validateRuntimeConnection } from "./runtime";

import type { CanvasPort, SaveRevisionRequest, StartRunRequest, SubmitRunInputRequest, UpdateNodeRequest } from "./host-wire.generated";

export type Id = string;
export interface CreateWorkspaceInput { name: string; path: string; }
export interface CreateCanvasInput { workspaceId: Id; name: string; }
export interface CreateNodeInput { canvasId: Id; name: string; kind: string; }
export interface CreateEdgeInput { canvasId: Id; sourceNodeId: Id; sourcePortId: Id; targetNodeId: Id; targetPortId: Id; kind: CanvasPort["kind"]; }
export interface CreatePortInput { nodeId: Id; name: string; direction: CanvasPort["direction"]; kind: CanvasPort["kind"]; }
export interface UpdateNodeInput extends UpdateNodeRequest { nodeId: Id; }
// canvasId is carried by the HTTP path, not by StartRunRequest's JSON body.
export type StartRunInput = StartRunRequest & { canvasId: Id; };
export interface SubmitRunInput extends SubmitRunInputRequest { runId: Id; }
export type SaveRevisionInput = SaveRevisionRequest;
export interface SetDefaultEntrypointInput { canvasId: Id; nodeId: Id; }
