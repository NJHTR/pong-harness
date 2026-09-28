/**
 * Seekwd graph-language runtime contract.
 *
 * This is the canonical model for new code. The legacy Host wire types remain
 * exported separately while the desktop MVP is migrated.
 */

export type Id = string;
export type Timestamp = string;
export type Digest = `${string}:${string}`;
export type SemVer = string;

export type CanvasKind =
  | "workflow"
  | "callable"
  | "event_handler"
  | "scheduled"
  | "fragment"
  | "library";

export type CanvasLifecycle = "active" | "archived" | "deleted";
export type RevisionValidationStatus = "unknown" | "valid" | "invalid" | "warnings";
export type ReleaseChannel = "stable" | "preview" | "internal";
export type ReleaseLifecycle = "active" | "deprecated" | "withdrawn";

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

export type PortDirection = "input" | "output";
export type PortKind = "data" | "control" | "event" | "stream" | "error";
export type EdgeKind = "data" | "control" | "event" | "error" | "compensation";
export type PortCardinality = "one" | "many";
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

export interface Position {
  x: number;
  y: number;
}

export interface DefinitionRef {
  definitionId: Id;
  version: SemVer;
  contentDigest: Digest;
}

export interface GraphPort {
  portId: Id;
  nodeId: Id;
  name: string;
  direction: PortDirection;
  kind: PortKind;
  valueType: PortValueType;
  required: boolean;
  cardinality: PortCardinality;
  description?: string;
}

export interface NodeInstance {
  nodeId: Id;
  canvasId: Id;
  definition: DefinitionRef;
  name: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  inputs: GraphPort[];
  outputs: GraphPort[];
  enabled: boolean;
  position: Position;
}

export interface PortEndpoint {
  nodeId: Id;
  portId: Id;
}

export interface Edge {
  edgeId: Id;
  canvasId: Id;
  source: PortEndpoint;
  target: PortEndpoint;
  kind: EdgeKind;
  mapping?: MappingExpression;
  enabled: boolean;
}

export type MappingExpression =
  | { kind: "identity" }
  | { kind: "select"; path: string }
  | { kind: "literal"; value: unknown }
  | { kind: "object"; fields: Record<string, MappingExpression> }
  | { kind: "array"; items: MappingExpression[] };

export type EntrypointKind = "manual" | "call" | "event" | "schedule" | "webhook";

export interface CanvasEntrypoint {
  entrypointId: Id;
  name: string;
  kind: EntrypointKind;
  targetNodeId: Id;
  manualInvocable: boolean;
  enabled: boolean;
  inputSchema?: Record<string, unknown>;
}

export interface TriggerBinding {
  triggerId: Id;
  kind: Exclude<EntrypointKind, "manual" | "call"> | "call";
  targetEntrypointId: Id;
  enabled: boolean;
}

export interface GraphDocument {
  schemaVersion: SemVer;
  nodes: NodeInstance[];
  edges: Edge[];
  entrypoints: CanvasEntrypoint[];
  /** Optional because callable modules and fragments need no manual entry. */
  defaultEntrypointId?: Id;
  triggers: TriggerBinding[];
}

export interface CanvasIdentity {
  canvasId: Id;
  workspaceId: Id;
  name: string;
  lifecycle: CanvasLifecycle;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CanvasDraft {
  draftId: Id;
  canvasId: Id;
  basedOnRevisionId?: Id;
  draftRevision: number;
  graph: GraphDocument;
  validation: {
    status: RevisionValidationStatus;
    errorCount: number;
    warningCount: number;
  };
  dirty: boolean;
  updatedBy: Id;
  updatedAt: Timestamp;
}

export interface CanvasRevision {
  revisionId: Id;
  canvasId: Id;
  revisionNumber: number;
  contentDigest: Digest;
  graph: GraphDocument;
  validation: {
    status: Exclude<RevisionValidationStatus, "unknown">;
    reportRef?: Id;
  };
  createdBy: Id;
  createdAt: Timestamp;
}

export interface CanvasRelease {
  releaseId: Id;
  canvasId: Id;
  revisionId: Id;
  channel: ReleaseChannel;
  version: SemVer;
  lifecycle: ReleaseLifecycle;
  publishedBy: Id;
  publishedAt: Timestamp;
}

export type RunStatus =
  | "created"
  | "preparing"
  | "ready"
  | "running"
  | "waiting_input"
  | "waiting_dependency"
  | "waiting_environment"
  | "waiting_approval"
  | "paused"
  | "repairing"
  | "verifying"
  | "cancelling"
  | "cancel_pending"
  | "reconciling"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired"
  | "blocked"
  | "completed_after_cancel"
  | "outcome_unknown";

export type NodeRunStatus =
  | "created"
  | "queued"
  | "dispatching"
  | "running"
  | "streaming"
  | "waiting_input"
  | "waiting_dependency"
  | "waiting_environment"
  | "waiting_approval"
  | "paused"
  | "repairing"
  | "verifying"
  | "cancelling"
  | "cancel_pending"
  | "reconciling"
  | "orphaned"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired"
  | "skipped"
  | "blocked"
  | "completed_after_cancel"
  | "outcome_unknown";

export interface RunSnapshot {
  snapshotId: Id;
  canvasId: Id;
  revisionId: Id;
  releaseId?: Id;
  entrypointId: Id;
  graphDigest: Digest;
  createdAt: Timestamp;
}

export interface Run {
  runId: Id;
  workspaceId: Id;
  snapshot: RunSnapshot;
  status: RunStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export interface GraphValidation {
  valid: boolean;
  errors: Array<{ code: string; message: string; nodeId?: Id; edgeId?: Id }>;
  warnings: Array<{ code: string; message: string; nodeId?: Id }>;
}

export type RuntimeInstruction =
  | { op: "enter"; entrypointId: Id; targetNodeId: Id }
  | { op: "dispatch_node"; nodeId: Id; definition: DefinitionRef; category: NodeCategory }
  | { op: "route_data"; edgeId: Id; source: PortEndpoint; target: PortEndpoint; mapping?: MappingExpression }
  | { op: "route_control"; edgeId: Id; source: PortEndpoint; target: PortEndpoint }
  | { op: "route_event"; edgeId: Id; source: PortEndpoint; target: PortEndpoint }
  | { op: "route_error"; edgeId: Id; source: PortEndpoint; target: PortEndpoint }
  | { op: "return"; nodeIds: Id[] };

export interface ExecutionPlan {
  schemaVersion: SemVer;
  graphSchemaVersion: SemVer;
  entrypointId: Id;
  startNodeId: Id;
  nodeOrder: Id[];
  instructions: RuntimeInstruction[];
  effectSummary: {
    nodeCategories: NodeCategory[];
    edgeKinds: EdgeKind[];
    hasExternalEffects: boolean;
  };
}

export interface ExecutionPlanCompilation {
  valid: boolean;
  plan?: ExecutionPlan;
  errors: GraphValidation["errors"];
  warnings: GraphValidation["warnings"];
}

function compatibleValueTypes(source: PortValueType, target: PortValueType): boolean {
  return source === "any" || target === "any" || source === target;
}

export function validateConnection(
  source: GraphPort,
  target: GraphPort,
  sourceCanvasId?: Id,
  targetCanvasId?: Id,
  targetHasConnection = false,
): ConnectionValidation {
  if (source.portId === target.portId) return { valid: false, reason: "same_port" };
  if (source.direction !== "output" || target.direction !== "input") {
    return { valid: false, reason: "same_direction" };
  }
  if (sourceCanvasId && targetCanvasId && sourceCanvasId !== targetCanvasId) {
    return { valid: false, reason: "cross_canvas" };
  }
  if (source.kind !== target.kind) return { valid: false, reason: "kind_mismatch" };
  if (!compatibleValueTypes(source.valueType, target.valueType)) {
    return { valid: false, reason: "value_type_mismatch" };
  }
  if (target.cardinality === "one" && targetHasConnection) {
    return { valid: false, reason: "input_already_connected" };
  }
  return { valid: true };
}

export function validateGraph(graph: GraphDocument, canvasKind: CanvasKind): GraphValidation {
  const errors: GraphValidation["errors"] = [];
  const warnings: GraphValidation["warnings"] = [];
  const nodes = new Map(graph.nodes.map((node) => [node.nodeId, node]));
  const ports = new Map<string, GraphPort>();
  const incoming = new Set<string>();

  for (const node of graph.nodes) {
    for (const port of [...node.inputs, ...node.outputs]) {
      if (ports.has(port.portId)) {
        errors.push({ code: "DUPLICATE_PORT_ID", message: `Port ${port.portId} is declared more than once.`, nodeId: node.nodeId });
      }
      if (port.nodeId !== node.nodeId) {
        errors.push({ code: "PORT_NODE_MISMATCH", message: `Port ${port.portId} does not belong to its node.`, nodeId: node.nodeId });
      }
      if (node.inputs.includes(port) && port.direction !== "input") {
        errors.push({ code: "INPUT_DIRECTION_MISMATCH", message: `Port ${port.portId} is listed as an input but has output direction.`, nodeId: node.nodeId });
      }
      if (node.outputs.includes(port) && port.direction !== "output") {
        errors.push({ code: "OUTPUT_DIRECTION_MISMATCH", message: `Port ${port.portId} is listed as an output but has input direction.`, nodeId: node.nodeId });
      }
      ports.set(port.portId, port);
    }
  }

  const defaultEntrypoints = graph.entrypoints.filter((entrypoint) => entrypoint.entrypointId === graph.defaultEntrypointId);
  if (graph.defaultEntrypointId && defaultEntrypoints.length !== 1) {
    errors.push({ code: "DEFAULT_ENTRYPOINT_NOT_FOUND", message: "The default entrypoint must reference exactly one entrypoint." });
  }
  if (graph.defaultEntrypointId) {
    const entrypoint = graph.entrypoints.find((candidate) => candidate.entrypointId === graph.defaultEntrypointId);
    if (entrypoint && (!entrypoint.enabled || !entrypoint.manualInvocable)) {
      errors.push({ code: "DEFAULT_ENTRYPOINT_NOT_MANUAL", message: "The default entrypoint must be enabled and manually invocable." });
    }
  }
  if (canvasKind === "workflow" && !graph.defaultEntrypointId) {
    errors.push({ code: "MANUAL_ENTRYPOINT_REQUIRED", message: "Workflow canvases require a default manual entrypoint." });
  }
  if (canvasKind !== "workflow" && !graph.defaultEntrypointId) {
    warnings.push({ code: "NO_DEFAULT_ENTRYPOINT", message: "This canvas cannot be started with the ordinary Run command." });
  }

  for (const entrypoint of graph.entrypoints) {
    if (!nodes.has(entrypoint.targetNodeId)) {
      errors.push({ code: "ENTRYPOINT_TARGET_MISSING", message: `Entrypoint ${entrypoint.name} targets a missing node.`, nodeId: entrypoint.targetNodeId });
    }
  }

  for (const edge of graph.edges) {
    if (edge.source.nodeId === edge.target.nodeId) {
      errors.push({ code: "SELF_LOOP", message: `Edge ${edge.edgeId} cannot connect a node to itself.`, edgeId: edge.edgeId });
    }
    const source = ports.get(edge.source.portId);
    const target = ports.get(edge.target.portId);
    if (!source || !target) {
      errors.push({ code: "EDGE_PORT_MISSING", message: `Edge ${edge.edgeId} references a missing port.`, edgeId: edge.edgeId });
      continue;
    }
    const sourceNode = nodes.get(source.nodeId);
    const targetNode = nodes.get(target.nodeId);
    const result = validateConnection(source, target, sourceNode?.canvasId, targetNode?.canvasId, incoming.has(target.portId));
    if (!result.valid) {
      errors.push({ code: `INVALID_CONNECTION_${result.reason?.toUpperCase()}`, message: `Edge ${edge.edgeId} is not a valid typed connection.`, edgeId: edge.edgeId });
    }
    if (source.nodeId !== edge.source.nodeId || target.nodeId !== edge.target.nodeId) {
      errors.push({ code: "EDGE_ENDPOINT_MISMATCH", message: `Edge ${edge.edgeId} endpoint does not match its port.`, edgeId: edge.edgeId });
    }
    if (edge.canvasId !== sourceNode?.canvasId || edge.canvasId !== targetNode?.canvasId) {
      errors.push({ code: "EDGE_CANVAS_MISMATCH", message: `Edge ${edge.edgeId} does not belong to both endpoint nodes.`, edgeId: edge.edgeId });
    }
    const edgeKindMatchesPorts =
      (edge.kind === "data" && source.kind === "data" && target.kind === "data") ||
      (edge.kind === "control" && source.kind === "control" && target.kind === "control") ||
      (edge.kind === "event" && source.kind === "event" && target.kind === "event") ||
      (edge.kind === "error" && source.kind === "error" && target.kind === "error") ||
      (edge.kind === "compensation" && source.kind === "control" && target.kind === "control");
    if (!edgeKindMatchesPorts) {
      errors.push({ code: "EDGE_KIND_MISMATCH", message: `Edge ${edge.edgeId} does not match its port kinds.`, edgeId: edge.edgeId });
    }
    if (target.cardinality === "one") incoming.add(target.portId);
  }

  return { valid: errors.length === 0, errors, warnings };
}

const externallyEffectfulCategories = new Set<NodeCategory>(["agent", "tool", "file", "console", "subcanvas", "approval", "resource"]);

function uniqueSorted<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function edgeInstruction(edge: Edge): RuntimeInstruction | undefined {
  if (edge.kind === "data") return { op: "route_data", edgeId: edge.edgeId, source: edge.source, target: edge.target, ...(edge.mapping ? { mapping: edge.mapping } : {}) };
  if (edge.kind === "control" || edge.kind === "compensation") return { op: "route_control", edgeId: edge.edgeId, source: edge.source, target: edge.target };
  if (edge.kind === "event") return { op: "route_event", edgeId: edge.edgeId, source: edge.source, target: edge.target };
  if (edge.kind === "error") return { op: "route_error", edgeId: edge.edgeId, source: edge.source, target: edge.target };
  return undefined;
}

/**
 * Compile a validated graph into a deterministic execution plan.
 * This is a graph VM plan, not machine code: Host capabilities still execute
 * file, process, network, Agent and child-canvas effects behind permission gates.
 */
export function compileExecutionPlan(graph: GraphDocument, canvasKind: CanvasKind, entrypointId = graph.defaultEntrypointId): ExecutionPlanCompilation {
  const validation = validateGraph(graph, canvasKind);
  const errors: GraphValidation["errors"] = [...validation.errors];
  const warnings: GraphValidation["warnings"] = [...validation.warnings];
  if (!entrypointId) {
    errors.push({ code: "ENTRYPOINT_REQUIRED", message: "An execution plan requires an explicit entrypoint." });
  }
  const entrypoint = entrypointId ? graph.entrypoints.find((candidate) => candidate.entrypointId === entrypointId) : undefined;
  if (entrypointId && !entrypoint) {
    errors.push({ code: "ENTRYPOINT_NOT_FOUND", message: `Entrypoint ${entrypointId} was not found.` });
  }
  if (entrypoint && !entrypoint.enabled) {
    errors.push({ code: "ENTRYPOINT_DISABLED", message: `Entrypoint ${entrypoint.name} is disabled.`, nodeId: entrypoint.targetNodeId });
  }
  if (errors.length || !entrypoint) {
    return { valid: false, errors, warnings };
  }

  const nodes = new Map(graph.nodes.filter((node) => node.enabled).map((node) => [node.nodeId, node]));
  const enabledEdges = graph.edges.filter((edge) => edge.enabled);
  const activationEdges = enabledEdges
    .filter((edge) => edge.kind === "control" || edge.kind === "data" || edge.kind === "event")
    .sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  const adjacency = new Map<Id, Edge[]>();
  for (const edge of activationEdges) {
    adjacency.set(edge.source.nodeId, [...(adjacency.get(edge.source.nodeId) ?? []), edge]);
  }

  const nodeOrder: Id[] = [];
  const visited = new Set<Id>();
  const queue = [entrypoint.targetNodeId];
  while (queue.length) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    const node = nodes.get(nodeId);
    if (!node) continue;
    visited.add(nodeId);
    nodeOrder.push(nodeId);
    for (const edge of adjacency.get(nodeId) ?? []) {
      queue.push(edge.target.nodeId);
    }
  }

  const routedEdges = enabledEdges
    .filter((edge) => visited.has(edge.source.nodeId) || visited.has(edge.target.nodeId))
    .sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  const instructions: RuntimeInstruction[] = [{ op: "enter", entrypointId: entrypoint.entrypointId, targetNodeId: entrypoint.targetNodeId }];
  for (const nodeId of nodeOrder) {
    const node = nodes.get(nodeId)!;
    instructions.push({ op: "dispatch_node", nodeId: node.nodeId, definition: node.definition, category: node.category });
    for (const edge of routedEdges.filter((candidate) => candidate.source.nodeId === nodeId)) {
      const instruction = edgeInstruction(edge);
      if (instruction) instructions.push(instruction);
    }
  }
  instructions.push({ op: "return", nodeIds: nodeOrder });

  return {
    valid: true,
    errors: [],
    warnings,
    plan: {
      schemaVersion: "1.0.0",
      graphSchemaVersion: graph.schemaVersion,
      entrypointId: entrypoint.entrypointId,
      startNodeId: entrypoint.targetNodeId,
      nodeOrder,
      instructions,
      effectSummary: {
        nodeCategories: uniqueSorted(nodeOrder.map((nodeId) => nodes.get(nodeId)!.category)),
        edgeKinds: uniqueSorted(routedEdges.map((edge) => edge.kind)),
        hasExternalEffects: nodeOrder.some((nodeId) => externallyEffectfulCategories.has(nodes.get(nodeId)!.category)),
      },
    },
  };
}
