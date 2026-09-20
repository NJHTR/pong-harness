import type { Canvas, CanvasRevision, CreateCanvasInput, CreateWorkspaceInput, HostSnapshot, Id, Notification, Run, StartRunInput, Workspace } from "@seekwd/protocol-schema";

export interface HostClient {
  snapshot(): Promise<HostSnapshot>;
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  renameWorkspace(id: Id, name: string): Promise<Workspace>;
  createCanvas(input: CreateCanvasInput): Promise<Canvas>;
  renameCanvas(id: Id, name: string): Promise<Canvas>;
  saveRevision(canvasId: Id): Promise<CanvasRevision>;
  startRun(input: StartRunInput): Promise<Run>;
  subscribe(listener: (snapshot: HostSnapshot) => void): () => void;
}

const key = "seekwd.vertical-slice.v1";
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const seed = (): HostSnapshot => {
  const workspace: Workspace = { id: "ws_thesis", name: "Thesis Workspace", path: "D:/Documents/Thesis", updatedAt: now() };
  const canvas: Canvas = { id: "canvas_citation", workspaceId: workspace.id, name: "Citation Review", status: "idle", defaultEntrypointNodeId: "node_start", revision: 3, updatedAt: now() };
  return { workspaces: [workspace], canvases: [canvas], revisions: [{ id: "rev_citation_3", canvasId: canvas.id, revision: 3, createdAt: now(), createdBy: "user", status: "validated" }], runs: [], notifications: [] };
};

export function createLocalHostClient(): HostClient {
  let state: HostSnapshot = JSON.parse(localStorage.getItem(key) ?? "null") ?? seed();
  const listeners = new Set<(snapshot: HostSnapshot) => void>();
  const commit = () => { localStorage.setItem(key, JSON.stringify(state)); listeners.forEach((listener) => listener(structuredClone(state))); };
  const workspace = (id: Id) => state.workspaces.find((item) => item.id === id);
  const canvas = (id: Id) => state.canvases.find((item) => item.id === id);
  const client: HostClient = {
    async snapshot() { return structuredClone(state); },
    async createWorkspace(input) { const item: Workspace = { id: uid("ws"), name: input.name.trim(), path: input.path.trim(), updatedAt: now() }; if (!item.name) throw new Error("Workspace name is required"); state.workspaces.push(item); commit(); return structuredClone(item); },
    async renameWorkspace(id, name) { const item = workspace(id); if (!item) throw new Error("Workspace not found"); item.name = name.trim(); item.updatedAt = now(); commit(); return structuredClone(item); },
    async createCanvas(input) { if (!workspace(input.workspaceId)) throw new Error("Workspace not found"); const item: Canvas = { id: uid("canvas"), workspaceId: input.workspaceId, name: input.name.trim() || "Untitled Canvas", status: "idle", defaultEntrypointNodeId: null, revision: 0, updatedAt: now() }; state.canvases.push(item); commit(); return structuredClone(item); },
    async renameCanvas(id, name) { const item = canvas(id); if (!item) throw new Error("Canvas not found"); item.name = name.trim(); item.updatedAt = now(); commit(); return structuredClone(item); },
    async saveRevision(canvasId) { const item = canvas(canvasId); if (!item) throw new Error("Canvas not found"); item.revision += 1; item.updatedAt = now(); const revision: CanvasRevision = { id: uid("revision"), canvasId, revision: item.revision, createdAt: now(), createdBy: "user", status: "debug" }; state.revisions.push(revision); commit(); return structuredClone(revision); },
    async startRun(input) { const item = canvas(input.canvasId); if (!item) throw new Error("Canvas not found"); if (!item.defaultEntrypointNodeId) throw new Error("A default entrypoint is required"); if (input.revision !== item.revision) throw new Error("Revision is stale"); const run: Run = { id: uid("run"), canvasId: item.id, revision: input.revision, status: "running", startedAt: now() }; item.status = "running"; state.runs.unshift(run); commit(); window.setTimeout(() => { const current = state.runs.find((candidate) => candidate.id === run.id); const currentCanvas = canvas(item.id); if (!current || !currentCanvas || current.status !== "running") return; current.status = "succeeded"; current.finishedAt = now(); currentCanvas.status = "succeeded"; const notification: Notification = { id: uid("notification"), title: "Run completed", message: `${currentCanvas.name} completed successfully.`, severity: "success", createdAt: now(), canvasId: currentCanvas.id, runId: current.id }; state.notifications.unshift(notification); commit(); }, 1600); return structuredClone(run); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return client;
}

export function createHttpHostClient(baseUrl = "http://127.0.0.1:4317"): HostClient {
  const local = createLocalHostClient();
  void baseUrl;
  return local;
}
