import { validateRuntimeConnection, type Canvas, type CanvasEdge, type CanvasNode, type CanvasPort, type CanvasRevision, type CreateCanvasInput, type CreateEdgeInput, type CreateNodeInput, type CreatePortInput, type CreateWorkspaceInput, type GraphDocument, type HostError, type HostEventBatch, type HostSnapshot, type Id, type Notification, type NodeCategory as RuntimeNodeCategory, type PortKind as RuntimePortKind, type Run, type RuntimeGraphPort, type StartRunInput, type SubmitRunInput, type UpdateNodeInput, type Workspace } from "@seekwd/protocol-schema";

export interface HostClient {
  snapshot(): Promise<HostSnapshot>;
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  renameWorkspace(id: Id, name: string): Promise<Workspace>;
  deleteWorkspace(id: Id): Promise<void>;
  createCanvas(input: CreateCanvasInput): Promise<Canvas>;
  createNode(input: CreateNodeInput): Promise<CanvasNode>;
  updateNode(input: UpdateNodeInput): Promise<CanvasNode>;
  deleteNode(nodeId: Id): Promise<void>;
  createPort(input: CreatePortInput): Promise<CanvasNode["ports"][number]>;
  createEdge(input: CreateEdgeInput): Promise<CanvasEdge>;
  deleteEdge(edgeId: Id): Promise<void>;
  renameCanvas(id: Id, name: string): Promise<Canvas>;
  deleteCanvas(id: Id): Promise<void>;
  setDefaultEntrypoint(canvasId: Id, nodeId: Id): Promise<Canvas>;
  saveRevision(canvasId: Id, expectedDraftRevision?: number): Promise<CanvasRevision>;
  startRun(input: StartRunInput): Promise<Run>;
  submitRunInput(input: SubmitRunInput): Promise<Run>;
  events(afterGlobalPosition: number, limit?: number): Promise<HostEventBatch>;
  subscribe(listener: (snapshot: HostSnapshot) => void): () => void;
}

const key = "seekwd.vertical-slice.v1";
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const legacyDigest = `sha256:${"0".repeat(64)}` as `${string}:${string}`;
const port = (nodeId: string, name: string, direction: CanvasPort["direction"], kind: CanvasPort["kind"]): CanvasPort => ({ id: uid("port"), nodeId, name, direction, kind });
const runtimePort = (value: CanvasPort): RuntimeGraphPort => ({
  portId: value.id,
  nodeId: value.nodeId,
  name: value.name,
  direction: value.direction,
  kind: value.kind === "flow" ? "control" : value.kind === "resource" ? "data" : value.kind,
  valueType: value.kind === "resource" ? "artifact" : value.kind === "data" ? "any" : value.kind === "event" ? "event" : "any",
  required: value.direction === "input",
  cardinality: "one",
});
const runtimeNodeCategory = (kind: string): RuntimeNodeCategory => {
  if (kind.startsWith("trigger.")) return "trigger";
  if (kind.startsWith("input.")) return "input";
  if (kind.startsWith("output.")) return "output";
  if (kind.startsWith("file.")) return "file";
  if (kind.startsWith("console.")) return "console";
  if (kind.startsWith("canvas.")) return "subcanvas";
  if (kind.startsWith("control.")) return "approval";
  if (kind.startsWith("agent.")) return "agent";
  if (kind.startsWith("transform.")) return "transform";
  return "tool";
};
const runtimePortKind = (kind: CanvasPort["kind"]): RuntimePortKind => kind === "flow" ? "control" : kind === "resource" ? "data" : kind;

/**
 * Convert the legacy Host snapshot graph into the canonical runtime graph.
 * This is the migration boundary for the MVP; new Host endpoints should
 * eventually return GraphDocument directly.
 */
export function toRuntimeGraphDocument(canvas: Canvas, nodes: CanvasNode[], edges: CanvasEdge[]): GraphDocument {
  const canvasNodes = nodes.filter((node) => node.canvasId === canvas.id);
  const canvasEdges = edges.filter((edge) => edge.canvasId === canvas.id);
  const entrypointId = canvas.defaultEntrypointNodeId ? `${canvas.id}:default` : undefined;
  return {
    schemaVersion: "1.0.0",
    nodes: canvasNodes.map((node, index) => ({
      nodeId: node.id,
      canvasId: node.canvasId,
      definition: {
        definitionId: node.kind,
        version: "0.1.0",
        contentDigest: legacyDigest,
      },
      name: node.name,
      category: runtimeNodeCategory(node.kind),
      config: node.config ?? {},
      inputs: node.ports.filter((port) => port.direction === "input").map((port) => ({
        portId: port.id,
        nodeId: port.nodeId,
        name: port.name,
        direction: "input" as const,
        kind: runtimePortKind(port.kind),
        valueType: port.kind === "data" ? "any" : port.kind === "resource" ? "artifact" : port.kind === "event" ? "event" : "any",
        required: true,
        cardinality: "one" as const,
      })),
      outputs: node.ports.filter((port) => port.direction === "output").map((port) => ({
        portId: port.id,
        nodeId: port.nodeId,
        name: port.name,
        direction: "output" as const,
        kind: runtimePortKind(port.kind),
        valueType: port.kind === "data" ? "any" : port.kind === "resource" ? "artifact" : port.kind === "event" ? "event" : "any",
        required: false,
        cardinality: "many" as const,
      })),
      enabled: true,
      position: { x: 80 + (index % 3) * 320, y: 145 + Math.floor(index / 3) * 145 },
    })),
    edges: canvasEdges.map((edge) => ({
      edgeId: edge.id,
      canvasId: edge.canvasId,
      source: { nodeId: edge.sourceNodeId, portId: edge.sourcePortId },
      target: { nodeId: edge.targetNodeId, portId: edge.targetPortId },
      kind: edge.kind === "flow" ? "control" : edge.kind === "resource" ? "data" : edge.kind,
      enabled: true,
    })),
    entrypoints: entrypointId && canvas.defaultEntrypointNodeId
      ? [{
        entrypointId,
        name: "Default",
        kind: "manual",
        targetNodeId: canvas.defaultEntrypointNodeId,
        manualInvocable: true,
        enabled: true,
      }]
      : [],
    ...(entrypointId ? { defaultEntrypointId: entrypointId } : {}),
    triggers: [],
  };
}
const defaultPorts = (nodeId: string, kind: string): CanvasPort[] => {
  if (kind === "trigger.start") return [port(nodeId, "Start", "output", "flow"), port(nodeId, "Event", "output", "event")];
  if (kind === "input.text") return [port(nodeId, "Start", "input", "flow"), port(nodeId, "Text", "output", "data"), port(nodeId, "Complete", "output", "flow")];
  if (kind === "input.file") return [port(nodeId, "Start", "input", "flow"), port(nodeId, "File", "output", "resource"), port(nodeId, "Complete", "output", "flow")];
  if (kind === "output.text") return [port(nodeId, "Input", "input", "data"), port(nodeId, "Start", "input", "flow")];
  if (kind === "control.approval") return [port(nodeId, "Request", "input", "data"), port(nodeId, "Approved", "output", "event")];
  if (kind === "trigger.event") return [port(nodeId, "Event", "output", "event")];
  if (kind === "workspace.scan") return [port(nodeId, "Start", "input", "flow"), port(nodeId, "Result", "output", "data"), port(nodeId, "Complete", "output", "flow")];
  return [port(nodeId, "Input", "input", "data"), port(nodeId, "Start", "input", "flow"), port(nodeId, "Result", "output", "data"), port(nodeId, "Artifact", "output", "resource"), port(nodeId, "Complete", "output", "event")];
};
const seed = (): HostSnapshot => {
  const workspace: Workspace = { id: "ws_thesis", name: "Thesis Workspace", path: "D:/Documents/Thesis", updatedAt: now() };
  const canvas: Canvas = { id: "canvas_citation", workspaceId: workspace.id, name: "Citation Review", status: "idle", defaultEntrypointNodeId: null, revision: 3, draftRevision: 0, draftDirty: false, updatedAt: now() };
  return { snapshotVersion: 1, workspaces: [workspace], canvases: [canvas], nodes: [], edges: [], revisions: [{ id: "rev_citation_3", canvasId: canvas.id, revision: 3, createdAt: now(), createdBy: "user", status: "validated", contentDigest: legacyDigest, graphJson: JSON.stringify({ nodes: [], edges: [] }) }], runs: [], notifications: [] };
};

export function createLocalHostClient(): HostClient {
  const stored = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<HostSnapshot> | null;
  let state: HostSnapshot = stored
    ? { snapshotVersion: stored.snapshotVersion ?? 1, workspaces: stored.workspaces ?? [], canvases: (stored.canvases ?? []).map((canvas) => ({ ...canvas, draftRevision: canvas.draftRevision ?? 0, draftDirty: canvas.draftDirty ?? false })), nodes: (stored.nodes ?? []).map((node) => ({ ...node, ports: node.ports ?? defaultPorts(node.id, node.kind) })), edges: (stored.edges ?? []).map((edge) => ({ ...edge, sourcePortId: edge.sourcePortId ?? "", targetPortId: edge.targetPortId ?? "", kind: edge.kind ?? "data" })), revisions: (stored.revisions ?? []).map((revision) => ({ ...revision, contentDigest: revision.contentDigest ?? legacyDigest, graphJson: revision.graphJson ?? JSON.stringify({ nodes: [], edges: [] }) })), runs: (stored.runs ?? []).map((run) => ({ ...run, finishedAt: run.finishedAt ?? null })), notifications: (stored.notifications ?? []).map((notification) => ({ ...notification, runId: notification.runId ?? null, canvasId: notification.canvasId ?? null })) }
    : seed();
  const listeners = new Set<(snapshot: HostSnapshot) => void>();
  let localGlobalPosition = 0;
  const commit = () => { state.snapshotVersion += 1; localGlobalPosition += 1; localStorage.setItem(key, JSON.stringify(state)); listeners.forEach((listener) => listener(structuredClone(state))); };
  const workspace = (id: Id) => state.workspaces.find((item) => item.id === id);
  const canvas = (id: Id) => state.canvases.find((item) => item.id === id);
  const needsInteractiveInput = (node: CanvasNode) => {
    if (node.kind === "task.manual") return true;
    if (node.kind !== "input.text") return false;
    const value = typeof node.config?.inputValue === "string" ? node.config.inputValue : "";
    return !value.trim();
  };
  const firstInteractiveNode = (canvasId: Id, completedNodeIds: string[]) => {
    const currentCanvas = canvas(canvasId);
    if (!currentCanvas?.defaultEntrypointNodeId) return undefined;
    const nodes = state.nodes.filter((node) => node.canvasId === canvasId);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const adjacency = new Map<string, string[]>();
    state.edges.filter((edge) => edge.canvasId === canvasId).forEach((edge) => {
      adjacency.set(edge.sourceNodeId, [...(adjacency.get(edge.sourceNodeId) ?? []), edge.targetNodeId]);
    });
    const queue = [currentCanvas.defaultEntrypointNodeId];
    const visited = new Set<string>();
    const completed = new Set(completedNodeIds);
    while (queue.length) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = byId.get(nodeId);
      if (node && !completed.has(nodeId) && needsInteractiveInput(node)) {
        const configured = typeof node.config?.instruction === "string" && node.config.instruction.trim()
          ? node.config.instruction
          : typeof node.config?.inputValue === "string" && node.config.inputValue.trim()
            ? node.config.inputValue
            : node.kind === "task.manual" ? `Complete the manual task: ${node.name}` : `Enter a value for ${node.name}`;
        return { node, prompt: configured };
      }
      queue.push(...(adjacency.get(nodeId) ?? []));
    }
    return undefined;
  };
  const resolveTextOutput = (canvasId: Id) => {
    const outputs = state.nodes.filter((node) => node.canvasId === canvasId && node.kind === "output.text");
    if (!outputs.length) return undefined;
    return outputs.map((output) => {
      const input = output.ports.find((candidate) => candidate.name === "Input" && candidate.direction === "input");
      const edge = state.edges.find((candidate) => candidate.canvasId === canvasId && candidate.targetPortId === input?.id);
      const source = edge ? state.nodes.find((node) => node.id === edge.sourceNodeId && node.kind === "input.text") : undefined;
      const value = typeof source?.config?.inputValue === "string" ? source.config.inputValue.trim() : "";
      if (!input || !edge || !source || !value) throw new Error("Text Output requires a configured Text Input value");
      return value;
    }).join("\n");
  };
  const client: HostClient = {
    async snapshot() { return structuredClone(state); },
    async createWorkspace(input) { const item: Workspace = { id: uid("ws"), name: input.name.trim(), path: input.path.trim(), updatedAt: now() }; if (!item.name) throw new Error("Workspace name is required"); state.workspaces.push(item); commit(); return structuredClone(item); },
    async renameWorkspace(id, name) { const item = workspace(id); if (!item) throw new Error("Workspace not found"); item.name = name.trim(); item.updatedAt = now(); commit(); return structuredClone(item); },
    async deleteWorkspace(id) { const item = workspace(id); if (!item) throw new Error("Workspace not found"); const canvasIds = state.canvases.filter((candidate) => candidate.workspaceId === id).map((candidate) => candidate.id); if (state.runs.some((run) => canvasIds.includes(run.canvasId) && (run.status === "running" || run.status === "waiting_input" || run.status === "queued"))) throw new Error("Cannot delete a workspace while one of its canvases has an active run."); state.workspaces = state.workspaces.filter((candidate) => candidate.id !== id); state.canvases = state.canvases.filter((candidate) => candidate.workspaceId !== id); state.nodes = state.nodes.filter((candidate) => !canvasIds.includes(candidate.canvasId)); state.edges = state.edges.filter((candidate) => !canvasIds.includes(candidate.canvasId)); state.revisions = state.revisions.filter((candidate) => !canvasIds.includes(candidate.canvasId)); state.runs = state.runs.filter((candidate) => !canvasIds.includes(candidate.canvasId)); state.notifications = state.notifications.filter((candidate) => !candidate.canvasId || !canvasIds.includes(candidate.canvasId)); commit(); },
    async createCanvas(input) { if (!workspace(input.workspaceId)) throw new Error("Workspace not found"); const item: Canvas = { id: uid("canvas"), workspaceId: input.workspaceId, name: input.name.trim() || "Untitled Canvas", status: "idle", defaultEntrypointNodeId: null, revision: 0, draftRevision: 0, draftDirty: false, updatedAt: now() }; state.canvases.push(item); commit(); return structuredClone(item); },
    async createNode(input) { const item = canvas(input.canvasId); if (!item) throw new Error("Canvas not found"); const nodeId = uid("node"); const node: CanvasNode = { id: nodeId, canvasId: item.id, name: input.name.trim() || "Untitled node", kind: input.kind.trim() || "task.manual", ports: defaultPorts(nodeId, input.kind.trim() || "task.manual") }; item.draftRevision += 1; item.draftDirty = true; item.updatedAt = now(); state.nodes.push(node); commit(); return structuredClone(node); },
    async updateNode(input) { const node = state.nodes.find((candidate) => candidate.id === input.nodeId); if (!node) throw new Error("Node not found"); if (input.name !== undefined) { const name = input.name.trim(); if (!name) throw new Error("Node name is required"); node.name = name; } if (input.config !== undefined) node.config = { ...(node.config ?? {}), ...input.config }; const item = canvas(node.canvasId); if (item) { item.draftRevision += 1; item.draftDirty = true; item.updatedAt = now(); } commit(); return structuredClone(node); },
    async deleteNode(nodeId) { const node = state.nodes.find((candidate) => candidate.id === nodeId); if (!node) throw new Error("Node not found"); const item = canvas(node.canvasId); if (!item) throw new Error("Canvas not found"); if (item.status === "running" || item.status === "waiting_input") throw new Error("Cannot delete a node while this canvas has an active run."); state.edges = state.edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId); state.nodes = state.nodes.filter((candidate) => candidate.id !== nodeId); if (item.defaultEntrypointNodeId === nodeId) item.defaultEntrypointNodeId = null; item.draftRevision += 1; item.draftDirty = true; item.updatedAt = now(); commit(); },
    async createPort(input) { const node = state.nodes.find((candidate) => candidate.id === input.nodeId); if (!node) throw new Error("Node not found"); const port = { id: uid("port"), nodeId: node.id, name: input.name.trim(), direction: input.direction, kind: input.kind }; if (!port.name) throw new Error("Port name is required"); if (node.ports.some((candidate) => candidate.name === port.name)) throw new Error("A port with this name already exists"); node.ports.push(port); const item = canvas(node.canvasId); if (item) { item.draftRevision += 1; item.draftDirty = true; item.updatedAt = now(); } commit(); return structuredClone(port); },
    async createEdge(input) {
      const item = canvas(input.canvasId);
      if (!item) throw new Error("Canvas not found");
      const source = state.nodes.find((node) => node.id === input.sourceNodeId && node.canvasId === item.id);
      const target = state.nodes.find((node) => node.id === input.targetNodeId && node.canvasId === item.id);
      const sourcePort = source?.ports.find((candidate) => candidate.id === input.sourcePortId);
      const targetPort = target?.ports.find((candidate) => candidate.id === input.targetPortId);
      if (!source || !target || !sourcePort || !targetPort) throw new Error("Connection endpoint not found");
      if (sourcePort.kind !== input.kind || targetPort.kind !== input.kind) throw new Error("Connection kind does not match the selected ports");
      const targetHasConnection = state.edges.some((edge) => edge.canvasId === item.id && edge.targetPortId === targetPort.id);
      const validation = validateRuntimeConnection(
        runtimePort(sourcePort),
        runtimePort(targetPort),
        source.canvasId,
        target.canvasId,
        targetHasConnection,
      );
      if (!validation.valid) {
        const messages: Record<NonNullable<typeof validation.reason>, string> = {
          same_port: "A port cannot connect to itself.",
          same_direction: "Connections must run from an output port to an input port.",
          cross_canvas: "Connections must stay inside one canvas.",
          kind_mismatch: "The two ports use different connection kinds.",
          value_type_mismatch: "The source value type is not compatible with the target input.",
          input_already_connected: "This input already has a connection.",
        };
        throw new Error(messages[validation.reason ?? "kind_mismatch"]);
      }
      if (state.edges.some((edge) => edge.canvasId === item.id && edge.sourcePortId === input.sourcePortId && edge.targetPortId === input.targetPortId)) {
        throw new Error("This connection already exists");
      }
      const edge: CanvasEdge = { id: uid("edge"), canvasId: item.id, sourceNodeId: input.sourceNodeId, sourcePortId: input.sourcePortId, targetNodeId: input.targetNodeId, targetPortId: input.targetPortId, kind: input.kind };
      item.draftRevision += 1;
      item.draftDirty = true;
      item.updatedAt = now();
      state.edges.push(edge);
      commit();
      return structuredClone(edge);
    },
    async deleteEdge(edgeId) { const edge = state.edges.find((candidate) => candidate.id === edgeId); if (!edge) throw new Error("Connection not found"); const item = canvas(edge.canvasId); if (!item) throw new Error("Canvas not found"); if (item.status === "running" || item.status === "waiting_input") throw new Error("Cannot change connections while this canvas has an active run."); state.edges = state.edges.filter((candidate) => candidate.id !== edgeId); item.draftRevision += 1; item.draftDirty = true; item.updatedAt = now(); commit(); },
    async renameCanvas(id, name) { const item = canvas(id); if (!item) throw new Error("Canvas not found"); item.name = name.trim(); item.updatedAt = now(); commit(); return structuredClone(item); },
    async deleteCanvas(id) { const item = canvas(id); if (!item) throw new Error("Canvas not found"); if (item.status === "running" || item.status === "waiting_input" || state.runs.some((run) => run.canvasId === id && (run.status === "running" || run.status === "waiting_input" || run.status === "queued"))) throw new Error("Cannot delete a canvas while it has an active run."); state.canvases = state.canvases.filter((candidate) => candidate.id !== id); state.nodes = state.nodes.filter((candidate) => candidate.canvasId !== id); state.edges = state.edges.filter((candidate) => candidate.canvasId !== id); state.revisions = state.revisions.filter((candidate) => candidate.canvasId !== id); state.runs = state.runs.filter((candidate) => candidate.canvasId !== id); state.notifications = state.notifications.filter((candidate) => candidate.canvasId !== id); commit(); },
    async setDefaultEntrypoint(canvasId, nodeId) { const item = canvas(canvasId); if (!item) throw new Error("Canvas not found"); if (!state.nodes.some((node) => node.id === nodeId && node.canvasId === canvasId)) throw new Error("Entrypoint node not found"); item.defaultEntrypointNodeId = nodeId; item.draftRevision += 1; item.draftDirty = true; item.updatedAt = now(); commit(); return structuredClone(item); },
    async saveRevision(canvasId, expectedDraftRevision) { const item = canvas(canvasId); if (!item) throw new Error("Canvas not found"); if (expectedDraftRevision !== undefined && expectedDraftRevision !== item.draftRevision) throw new Error("Draft revision is stale"); item.revision += 1; item.draftDirty = false; item.updatedAt = now(); const graphJson = JSON.stringify({ nodes: state.nodes.filter((node) => node.canvasId === canvasId), edges: state.edges.filter((edge) => edge.canvasId === canvasId) }); const revision: CanvasRevision = { id: uid("revision"), canvasId, revision: item.revision, createdAt: now(), createdBy: "user", status: "debug", contentDigest: legacyDigest, graphJson }; state.revisions.push(revision); commit(); return structuredClone(revision); },
    async startRun(input) { const item = canvas(input.canvasId); if (!item) throw new Error("Canvas not found"); if (!item.defaultEntrypointNodeId) throw new Error("This canvas has no manual entrypoint. Configure an entrypoint before running."); if (input.revision !== item.revision) throw new Error("Revision is stale"); if (item.status === "running" || item.status === "waiting_input") throw new Error("A run is already active or waiting for input"); const unsupported = state.nodes.find((node) => node.canvasId === item.id && !["trigger.start", "input.text", "task.manual", "output.text"].includes(node.kind)); if (unsupported) throw new Error(`Node kind ${unsupported.kind} is not executable in this MVP`); const run: Run = { id: uid("run"), canvasId: item.id, revision: input.revision, status: "running", startedAt: now(), finishedAt: null, currentNodeId: null, inputPrompt: null, result: null, completedNodeIds: [] }; item.status = "running"; state.runs.unshift(run); commit(); window.setTimeout(() => { const current = state.runs.find((candidate) => candidate.id === run.id); const currentCanvas = canvas(item.id); if (!current || !currentCanvas || current.status !== "running") return; const next = firstInteractiveNode(item.id, current.completedNodeIds ?? []); if (next) { current.status = "waiting_input"; current.currentNodeId = next.node.id; current.inputPrompt = next.prompt; currentCanvas.status = "waiting_input"; } else { try { current.result = resolveTextOutput(item.id) ?? null; current.status = "succeeded"; current.finishedAt = now(); currentCanvas.status = "succeeded"; } catch (error) { current.status = "failed"; current.inputPrompt = error instanceof Error ? error.message : "Text Output could not resolve its input."; current.finishedAt = now(); currentCanvas.status = "failed"; } } commit(); }, 80); return structuredClone(run); },
    async submitRunInput(input) { const run = state.runs.find((candidate) => candidate.id === input.runId); if (!run) throw new Error("Run not found"); if (run.status !== "waiting_input") throw new Error("This run is not waiting for input"); const item = canvas(run.canvasId); if (!item) throw new Error("Canvas not found"); if (!input.value.trim()) throw new Error("A result value is required"); const submittedNodeName = run.currentNodeId ? state.nodes.find((node) => node.id === run.currentNodeId)?.name ?? "Interactive task" : "Interactive task"; run.result = input.value.trim(); if (run.currentNodeId && !(run.completedNodeIds ?? []).includes(run.currentNodeId)) run.completedNodeIds = [...(run.completedNodeIds ?? []), run.currentNodeId]; const next = firstInteractiveNode(item.id, run.completedNodeIds ?? []); if (next) { run.status = "waiting_input"; run.currentNodeId = next.node.id; run.inputPrompt = next.prompt; item.status = "waiting_input"; } else { run.status = "succeeded"; run.finishedAt = now(); run.currentNodeId = null; run.inputPrompt = null; item.status = "succeeded"; } const notification: Notification = { id: uid("notification"), title: next ? "Run waiting for input" : "Run completed", message: next ? `${item.name} is waiting for a local input: ${run.inputPrompt}.` : `${submittedNodeName} received your submission. ${item.name} run completed successfully.`, severity: next ? "info" : "success", createdAt: now(), canvasId: item.id, runId: run.id }; state.notifications.unshift(notification); commit(); return structuredClone(run); },
    events: async (afterGlobalPosition, limit = 100) => { const next = afterGlobalPosition < localGlobalPosition ? Math.min(localGlobalPosition, afterGlobalPosition + Math.max(1, limit)) : afterGlobalPosition; return { events: next > afterGlobalPosition ? [{ eventId: uid("event"), eventType: "projection.snapshot.updated" as const, globalPosition: next, snapshotVersion: state.snapshotVersion, occurredAt: now() }] : [], nextGlobalPosition: next, snapshotVersion: state.snapshotVersion }; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return client;
}

export function createHttpHostClient(baseUrl = "http://127.0.0.1:4317", token?: string): HostClient {
  const root = baseUrl.replace(/\/$/, "");
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${root}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
    });
    if (!response.ok) {
      const body = await response.text();
      let error: Partial<HostError> = {};
      try { error = JSON.parse(body) as HostError; } catch { /* legacy/plain-text host response */ }
      const message = error.message || body || `Host request failed (${response.status})`;
      const failure = new Error(message) as Error & Partial<HostError>;
      failure.name = error.code || "HOST_REQUEST_FAILED";
      failure.code = error.code;
      failure.retryable = error.retryable;
      throw failure;
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  };
  const client: HostClient = {
    snapshot: () => request<HostSnapshot>("/api/snapshot"),
    createWorkspace: (input) => request<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(input) }),
    renameWorkspace: (id, name) => request<Workspace>(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    deleteWorkspace: async (id) => { await request<void>(`/api/workspaces/${id}`, { method: "DELETE" }); },
    createCanvas: (input) => request<Canvas>(`/api/workspaces/${input.workspaceId}/canvases`, { method: "POST", body: JSON.stringify(input) }),
    createNode: (input) => request<CanvasNode>(`/api/canvases/${input.canvasId}/nodes`, { method: "POST", body: JSON.stringify({ name: input.name, kind: input.kind }) }),
    updateNode: ({ nodeId, ...body }) => request<CanvasNode>(`/api/nodes/${nodeId}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteNode: async (nodeId) => { await request<void>(`/api/nodes/${nodeId}`, { method: "DELETE" }); },
    createPort: (input) => request<CanvasNode["ports"][number]>(`/api/nodes/${input.nodeId}/ports`, { method: "POST", body: JSON.stringify({ name: input.name, direction: input.direction, kind: input.kind }) }),
    createEdge: (input) => request<CanvasEdge>(`/api/canvases/${input.canvasId}/edges`, { method: "POST", body: JSON.stringify({ sourceNodeId: input.sourceNodeId, sourcePortId: input.sourcePortId, targetNodeId: input.targetNodeId, targetPortId: input.targetPortId, kind: input.kind }) }),
    deleteEdge: async (edgeId) => { await request<void>(`/api/edges/${edgeId}`, { method: "DELETE" }); },
    renameCanvas: (id, name) => request<Canvas>(`/api/canvases/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    deleteCanvas: async (id) => { await request<void>(`/api/canvases/${id}`, { method: "DELETE" }); },
    setDefaultEntrypoint: (canvasId, nodeId) => request<Canvas>(`/api/canvases/${canvasId}/entrypoint`, { method: "PUT", body: JSON.stringify({ nodeId }) }),
    saveRevision: (canvasId, expectedDraftRevision) => request<CanvasRevision>(`/api/canvases/${canvasId}/revisions`, { method: "POST", body: JSON.stringify(expectedDraftRevision === undefined ? {} : { expectedDraftRevision }) }),
    startRun: ({ canvasId, ...body }) => request<Run>(`/api/canvases/${canvasId}/runs`, { method: "POST", body: JSON.stringify(body) }),
    submitRunInput: ({ runId, ...body }) => request<Run>(`/api/runs/${runId}/input`, { method: "POST", body: JSON.stringify(body) }),
    events: (afterGlobalPosition, limit = 100) => request<HostEventBatch>(`/api/events?afterGlobalPosition=${afterGlobalPosition}&limit=${limit}`),
    subscribe(listener) {
      let active = true;
      let previousVersion = -1;
      let globalPosition = 0;
      const poll = async () => {
        try {
          const batch = await client.events(globalPosition, 100);
          if (active && batch.events.length > 0) {
            globalPosition = batch.nextGlobalPosition;
            const next = await client.snapshot();
            if (next.snapshotVersion !== previousVersion) {
              previousVersion = next.snapshotVersion;
              listener(next);
            }
          } else if (active && previousVersion < 0) {
            const next = await client.snapshot();
            previousVersion = next.snapshotVersion;
            listener(next);
          }
        } catch {
          // The next poll retries after a transient Host disconnect.
        }
        if (active) window.setTimeout(poll, 1000);
      };
      void poll();
      return () => { active = false; };
    },
  };
  return client;
}
