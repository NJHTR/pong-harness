/**
 * The product-level graph contract.
 *
 * A Canvas is the executable boundary. Nodes describe capabilities, data,
 * control points or nested canvases. Edges are typed connections between
 * declared ports; UI code must not infer compatibility from node names.
 */

export type GraphId = string;

export type CanvasKind =
  | "workflow"
  | "callable"
  | "event_handler"
  | "scheduled"
  | "fragment"
  | "library";

export type NodeCategory =
  | "trigger"
  | "input"
  | "transform"
  | "agent"
  | "tool"
  | "file"
  | "console"
  | "output"
  | "subcanvas"
  | "approval"
  | "state"
  | "control"
  | "resource";

export type GraphEdgeKind = "control" | "data" | "event" | "resource" | "reference";

export type PortValueType =
  | "any"
  | "text"
  | "number"
  | "boolean"
  | "json"
  | "file"
  | "directory"
  | "artifact"
  | "secret_ref"
  | "run"
  | "canvas_ref"
  | "agent_profile"
  | "event";

export type PortDirection = "input" | "output";
export type PortCardinality = "one" | "many";

export interface GraphPosition {
  x: number;
  y: number;
}

export interface GraphPort {
  id: GraphId;
  nodeId: GraphId;
  name: string;
  direction: PortDirection;
  edgeKind: GraphEdgeKind;
  valueType: PortValueType;
  required?: boolean;
  cardinality?: PortCardinality;
  description?: string;
}

export interface GraphNode {
  id: GraphId;
  canvasId: GraphId;
  name: string;
  type: string;
  category: NodeCategory;
  position: GraphPosition;
  inputs: GraphPort[];
  outputs: GraphPort[];
  config: Record<string, unknown>;
  disabled?: boolean;
}

export interface GraphEdge {
  id: GraphId;
  canvasId: GraphId;
  kind: GraphEdgeKind;
  source: {
    nodeId: GraphId;
    portId: GraphId;
  };
  target: {
    nodeId: GraphId;
    portId: GraphId;
  };
  mapping?: string;
  delivery?: "at_most_once" | "at_least_once" | "exactly_once";
  enabled?: boolean;
}

export type EntrypointKind = "manual" | "call" | "event" | "schedule" | "webhook";

export interface GraphEntrypoint {
  id: GraphId;
  name: string;
  kind: EntrypointKind;
  targetNodeId: GraphId;
  inputSchema?: Record<string, unknown>;
  enabled: boolean;
  isDefault?: boolean;
}

export interface GraphCanvas {
  id: GraphId;
  workspaceId: GraphId;
  name: string;
  kind: CanvasKind;
  nodes: GraphNode[];
  edges: GraphEdge[];
  entrypoints: GraphEntrypoint[];
  metadata?: Record<string, unknown>;
}

export interface ConnectionValidation {
  valid: boolean;
  reason?:
    | "same_port"
    | "same_direction"
    | "cross_canvas"
    | "kind_mismatch"
    | "value_type_mismatch"
    | "input_already_connected";
}

function valueTypesCompatible(source: PortValueType, target: PortValueType): boolean {
  return source === "any" || target === "any" || source === target;
}

/**
 * Validate a proposed connection before drawing or persisting an edge.
 * This is intentionally pure so the canvas UI, Host and SDK can share it.
 */
export function validateConnection(
  source: GraphPort,
  target: GraphPort,
  sourceNodeCanvasId?: GraphId,
  targetNodeCanvasId?: GraphId,
  targetHasConnection = false,
): ConnectionValidation {
  if (source.id === target.id) return { valid: false, reason: "same_port" };
  if (source.direction !== "output" || target.direction !== "input") {
    return { valid: false, reason: "same_direction" };
  }
  if (sourceNodeCanvasId && targetNodeCanvasId && sourceNodeCanvasId !== targetNodeCanvasId) {
    return { valid: false, reason: "cross_canvas" };
  }
  if (source.edgeKind !== target.edgeKind) return { valid: false, reason: "kind_mismatch" };
  if (!valueTypesCompatible(source.valueType, target.valueType)) {
    return { valid: false, reason: "value_type_mismatch" };
  }
  if (target.cardinality !== "many" && targetHasConnection) {
    return { valid: false, reason: "input_already_connected" };
  }
  return { valid: true };
}

