import {
  ApiError,
  type AddNodeInput,
  type Canvas,
  type CanvasGraph,
  type CreateCanvasInput,
  type CreateEdgeInput,
  type CreateWorkspaceInput,
  type DeleteImpact,
  type Edge,
  type Node,
  type NodePatch,
  type NotificationItem,
  type Port,
  type RunScope,
  type RunSession,
  type RuntimeEvent,
  type SeekwdApi,
  type Workspace,
} from "./types";
import { mockCanvases, mockEdges, mockNodes, mockNotifications, mockPorts, mockRuns, mockWorkspaces } from "./data";

const clone = <T,>(value: T): T => structuredClone(value);
const timestamp = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export function createMockSeekwdApi(): SeekwdApi {
  const workspaces = new Map(mockWorkspaces.map((item) => [item.id, clone(item)]));
  const canvases = new Map(mockCanvases.map((item) => [item.id, clone(item)]));
  const nodes = new Map(mockNodes.map((item) => [item.id, clone(item)]));
  const ports = new Map(mockPorts.map((item) => [item.id, clone(item)]));
  const edges = new Map(mockEdges.map((item) => [item.id, clone(item)]));
  const runs = new Map(mockRuns.map((item) => [item.id, clone(item)]));
  const notifications = new Map(mockNotifications.map((item) => [item.id, clone(item)]));
  const listeners = new Set<(event: RuntimeEvent) => void>();
  const timers = new Map<string, number>();

  const emit = (event: RuntimeEvent) => listeners.forEach((listener) => listener(clone(event)));
  const workspaceOrThrow = (workspaceId: string) => {
    const workspace = workspaces.get(workspaceId);
    if (!workspace) throw new ApiError("NOT_FOUND", `Workspace ${workspaceId} was not found.`);
    return workspace;
  };
  const canvasOrThrow = (canvasId: string) => {
    const canvas = canvases.get(canvasId);
    if (!canvas) throw new ApiError("NOT_FOUND", `Canvas ${canvasId} was not found.`);
    return canvas;
  };
  const nodeOrThrow = (nodeId: string) => {
    const node = nodes.get(nodeId);
    if (!node) throw new ApiError("NOT_FOUND", `Node ${nodeId} was not found.`);
    return node;
  };
  const runOrThrow = (runId: string) => {
    const run = runs.get(runId);
    if (!run) throw new ApiError("NOT_FOUND", `Run ${runId} was not found.`);
    return run;
  };
  const updateWorkspaceStatus = (workspaceId: string) => {
    const workspace = workspaceOrThrow(workspaceId);
    const states = workspace.canvasIds.map((canvasId) => canvases.get(canvasId)?.status ?? "idle");
    workspace.status = (['error', 'waiting', 'running', 'success', 'idle'] as const).find((state) => states.includes(state)) ?? "idle";
    workspace.updatedAt = timestamp();
    emit({ type: "workspace.updated", workspace });
  };
  const updateCanvas = (canvas: Canvas) => { canvas.updatedAt = timestamp(); emit({ type: "canvas.updated", canvas }); updateWorkspaceStatus(canvas.workspaceId); };

  const completeRun = (runId: string) => {
    const run = runs.get(runId);
    if (!run || run.state !== "running") return;
    run.state = "success";
    run.finishedAt = timestamp();
    run.logs.push({ id: id("log"), runId, timestamp: timestamp(), level: "info", message: "Run completed successfully." });
    const canvas = canvasOrThrow(run.rootCanvasId);
    canvas.status = "success";
    canvas.latestRunId = run.id;
    updateCanvas(canvas);
    emit({ type: "run.updated", run });
    const notification: NotificationItem = { id: id("notification"), severity: "success", title: "Canvas completed", message: `${canvas.name} finished successfully.`, workspaceId: run.workspaceId, canvasId: canvas.id, runId, createdAt: timestamp(), action: { label: "Open output", command: "open-run-output" } };
    notifications.set(notification.id, notification);
    emit({ type: "notification.created", notification });
  };

  const api: SeekwdApi = {
    async listWorkspaces() { return clone([...workspaces.values()]); },
    async getWorkspace(workspaceId) { return clone(workspaceOrThrow(workspaceId)); },
    async createWorkspace(input: CreateWorkspaceInput) {
      const workspace: Workspace = { id: id("ws"), name: input.name.trim(), path: input.path, status: "idle", canvasIds: [], recentCanvasIds: [], createdAt: timestamp(), updatedAt: timestamp() };
      if (!workspace.name) throw new ApiError("INVALID_INPUT", "Workspace name is required.");
      workspaces.set(workspace.id, workspace);
      emit({ type: "workspace.updated", workspace });
      return clone(workspace);
    },
    async renameWorkspace(workspaceId, name) {
      const workspace = workspaceOrThrow(workspaceId);
      if (!name.trim()) throw new ApiError("INVALID_INPUT", "Workspace name is required.");
      workspace.name = name.trim(); workspace.updatedAt = timestamp(); emit({ type: "workspace.updated", workspace }); return clone(workspace);
    },
    async deleteWorkspace(workspaceId) {
      const workspace = workspaceOrThrow(workspaceId);
      const affectedCanvasIds = [...workspace.canvasIds];
      const affectedNodeIds = affectedCanvasIds.flatMap((canvasId) => canvasOrThrow(canvasId).nodeIds);
      const affectedRunIds = [...runs.values()].filter((run) => run.workspaceId === workspaceId).map((run) => run.id);
      affectedCanvasIds.forEach((canvasId) => { canvases.delete(canvasId); });
      affectedNodeIds.forEach((nodeId) => nodes.delete(nodeId));
      affectedRunIds.forEach((runId) => runs.delete(runId));
      workspaces.delete(workspaceId);
      return { objectId: workspaceId, objectType: "workspace", affectedCanvasIds, affectedNodeIds, affectedRunIds, references: 0 } satisfies DeleteImpact;
    },
    async listCanvases(workspaceId) { const workspace = workspaceOrThrow(workspaceId); return clone(workspace.canvasIds.map((canvasId) => canvasOrThrow(canvasId))); },
    async getCanvas(canvasId) { return clone(canvasOrThrow(canvasId)); },
    async createCanvas(input: CreateCanvasInput) {
      const workspace = workspaceOrThrow(input.workspaceId);
      const canvas: Canvas = { id: id("canvas"), workspaceId: workspace.id, name: input.name.trim() || "Untitled Canvas", description: input.description, status: "idle", primaryNodeId: null, nodeIds: [], edgeIds: [], updatedAt: timestamp() };
      canvases.set(canvas.id, canvas); workspace.canvasIds.push(canvas.id); workspace.recentCanvasIds.unshift(canvas.id); updateCanvas(canvas); return clone(canvas);
    },
    async renameCanvas(canvasId, name) { const canvas = canvasOrThrow(canvasId); if (!name.trim()) throw new ApiError("INVALID_INPUT", "Canvas name is required."); canvas.name = name.trim(); updateCanvas(canvas); return clone(canvas); },
    async deleteCanvas(canvasId) {
      const canvas = canvasOrThrow(canvasId);
      const affectedNodeIds = [...canvas.nodeIds];
      const affectedRunIds = [...runs.values()].filter((run) => run.rootCanvasId === canvasId).map((run) => run.id);
      const workspace = workspaceOrThrow(canvas.workspaceId);
      workspace.canvasIds = workspace.canvasIds.filter((idValue) => idValue !== canvasId);
      workspace.recentCanvasIds = workspace.recentCanvasIds.filter((idValue) => idValue !== canvasId);
      affectedNodeIds.forEach((nodeId) => nodes.delete(nodeId));
      canvas.edgeIds.forEach((edgeId) => edges.delete(edgeId));
      affectedRunIds.forEach((runId) => runs.delete(runId));
      canvases.delete(canvasId); updateWorkspaceStatus(workspace.id);
      return { objectId: canvasId, objectType: "canvas", affectedCanvasIds: [canvasId], affectedNodeIds, affectedRunIds, references: 0 } satisfies DeleteImpact;
    },
    async getCanvasGraph(canvasId): Promise<CanvasGraph> { const canvas = canvasOrThrow(canvasId); return clone({ canvas, nodes: canvas.nodeIds.map((nodeId) => nodeOrThrow(nodeId)), ports: [...ports.values()].filter((port) => canvas.nodeIds.includes(port.nodeId)), edges: canvas.edgeIds.map((edgeId) => edges.get(edgeId)).filter((edge): edge is Edge => Boolean(edge)), revision: 1 }); },
    async addNode(input: AddNodeInput) {
      const canvas = canvasOrThrow(input.canvasId);
      const node: Node = { id: id("node"), canvasId: canvas.id, name: input.name.trim() || "Untitled Node", type: input.type ?? "agent.task", typeLabel: input.typeLabel ?? "Agent task", state: "idle", primary: false, position: input.position ?? { x: 120, y: 120 }, inputPortIds: [], outputPortIds: [], config: input.config ?? {} };
      nodes.set(node.id, node); canvas.nodeIds.push(node.id); updateCanvas(canvas); emit({ type: "node.updated", node }); return clone(node);
    },
    async updateNode(nodeId, patch: NodePatch) { const node = nodeOrThrow(nodeId); Object.assign(node, patch, patch.config ? { config: { ...node.config, ...patch.config } } : {}); emit({ type: "node.updated", node }); return clone(node); },
    async deleteNode(nodeId) {
      const node = nodeOrThrow(nodeId); const canvas = canvasOrThrow(node.canvasId);
      const relatedEdges = [...edges.values()].filter((edge) => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId);
      relatedEdges.forEach((edge) => edges.delete(edge.id));
      canvas.edgeIds = canvas.edgeIds.filter((edgeId) => !relatedEdges.some((edge) => edge.id === edgeId));
      canvas.nodeIds = canvas.nodeIds.filter((idValue) => idValue !== nodeId); if (canvas.primaryNodeId === nodeId) canvas.primaryNodeId = null;
      nodes.delete(nodeId); updateCanvas(canvas); return { objectId: nodeId, objectType: "node", affectedCanvasIds: [canvas.id], affectedNodeIds: [nodeId], affectedRunIds: [], references: relatedEdges.length } satisfies DeleteImpact;
    },
    async setPrimaryNode(canvasId, nodeId) { const canvas = canvasOrThrow(canvasId); const node = nodeOrThrow(nodeId); if (node.canvasId !== canvasId) throw new ApiError("INVALID_GRAPH", "Entry node must belong to the canvas."); canvas.nodeIds.forEach((candidateId) => { const candidate = nodeOrThrow(candidateId); candidate.primary = candidate.id === nodeId; emit({ type: "node.updated", node: candidate }); }); canvas.primaryNodeId = nodeId; updateCanvas(canvas); return clone(canvas); },
    async connectNodes(input: CreateEdgeInput) {
      const canvas = canvasOrThrow(input.canvasId); nodeOrThrow(input.sourceNodeId); nodeOrThrow(input.targetNodeId); if (!canvas.nodeIds.includes(input.sourceNodeId) || !canvas.nodeIds.includes(input.targetNodeId)) throw new ApiError("INVALID_GRAPH", "Both nodes must belong to the canvas.");
      const edge: Edge = { id: id("edge"), canvasId: canvas.id, sourceNodeId: input.sourceNodeId, sourcePortId: input.sourcePortId, targetNodeId: input.targetNodeId, targetPortId: input.targetPortId, kind: input.kind ?? "data", label: input.label, enabled: true };
      edges.set(edge.id, edge); canvas.edgeIds.push(edge.id); const sourcePort = ports.get(edge.sourcePortId); const targetPort = ports.get(edge.targetPortId); if (sourcePort) sourcePort.connectionCount += 1; if (targetPort) targetPort.connectionCount += 1; updateCanvas(canvas); return clone(edge);
    },
    async disconnectNodes(edgeId) { const edge = edges.get(edgeId); if (!edge) throw new ApiError("NOT_FOUND", `Edge ${edgeId} was not found.`); edges.delete(edgeId); const canvas = canvasOrThrow(edge.canvasId); canvas.edgeIds = canvas.edgeIds.filter((candidate) => candidate !== edgeId); const sourcePort = ports.get(edge.sourcePortId); const targetPort = ports.get(edge.targetPortId); if (sourcePort) sourcePort.connectionCount = Math.max(0, sourcePort.connectionCount - 1); if (targetPort) targetPort.connectionCount = Math.max(0, targetPort.connectionCount - 1); updateCanvas(canvas); },
    async listRuns(scope) { return clone([...runs.values()].filter((run) => scope.type === "canvas" ? run.rootCanvasId === scope.canvasId : run.workspaceId === scope.workspaceId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))); },
    async getRun(runId) { return clone(runOrThrow(runId)); },
    async startRun(canvasId) {
      const canvas = canvasOrThrow(canvasId); if (!canvas.primaryNodeId) throw new ApiError("NOT_RUNNABLE", "Choose a canvas entry node before running."); const workspace = workspaceOrThrow(canvas.workspaceId); const run: RunSession = { id: id("run"), workspaceId: workspace.id, rootCanvasId: canvas.id, state: "running", startedAt: timestamp(), currentNodeId: canvas.primaryNodeId, nodeRuns: [], logs: [{ id: id("log"), runId: "pending", timestamp: timestamp(), level: "info", message: `Started ${canvas.name}.` }], artifacts: [], approvals: [], inputRequests: [] }; run.logs[0].runId = run.id; runs.set(run.id, run); canvas.status = "running"; canvas.latestRunId = run.id; updateCanvas(canvas); emit({ type: "run.created", run }); const timer = window.setTimeout(() => completeRun(run.id), 1600); timers.set(run.id, timer); return clone(run);
    },
    async pauseRun(runId) { const run = runOrThrow(runId); if (run.state === "running") { run.state = "paused"; emit({ type: "run.updated", run }); } },
    async resumeRun(runId) { const run = runOrThrow(runId); if (run.state === "paused") { run.state = "running"; emit({ type: "run.updated", run }); const timer = window.setTimeout(() => completeRun(run.id), 1200); timers.set(run.id, timer); } },
    async cancelRun(runId) { const run = runOrThrow(runId); const timer = timers.get(runId); if (timer) window.clearTimeout(timer); run.state = "cancelled"; run.finishedAt = timestamp(); const canvas = canvasOrThrow(run.rootCanvasId); canvas.status = "idle"; updateCanvas(canvas); emit({ type: "run.updated", run }); },
    async retryRun(runId) { const run = runOrThrow(runId); return api.startRun(run.rootCanvasId); },
    async listNotifications() { return clone([...notifications.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))); },
    async dismissNotification(notificationId) { if (notifications.delete(notificationId)) emit({ type: "notification.dismissed", notificationId }); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return api;
}

