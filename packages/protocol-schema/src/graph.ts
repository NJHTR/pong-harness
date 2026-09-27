/**
 * Compatibility facade for the first graph contract.
 *
 * New code must import the runtime contract from `./runtime`. These aliases
 * keep existing package consumers compiling while the MVP wire is migrated.
 */

export {
  validateConnection,
  type CanvasDraft,
  type CanvasEntrypoint as GraphEntrypoint,
  type CanvasIdentity,
  type CanvasKind,
  type CanvasRelease,
  type CanvasRevision,
  type DefinitionRef,
  type Edge as GraphEdge,
  type EdgeKind as GraphEdgeKind,
  type EntrypointKind,
  type GraphDocument as GraphCanvas,
  type GraphPort,
  type NodeCategory,
  type NodeInstance as GraphNode,
  type PortCardinality,
  type PortDirection,
  type PortKind,
  type PortValueType,
  type Position as GraphPosition,
  type Run,
  type RunSnapshot,
  type RunStatus,
} from "./runtime";

export type GraphId = import("./runtime").Id;
export type ConnectionValidation = import("./runtime").ConnectionValidation;
