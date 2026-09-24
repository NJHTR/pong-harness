import type { Canvas, CanvasNode, CanvasRevision, CreateCanvasInput, CreateWorkspaceInput, HostError, HostEventBatch, HostSnapshot, Id, Notification, Run, StartRunInput, Workspace } from "@seekwd/protocol-schema";

export interface HostClient {
  snapshot(): Promise<HostSnapshot>;
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  renameWorkspace(id: Id, name: string): Promise<Workspace>;
  createCanvas(input: CreateCanvasInput): Promise<Canvas>;
  renameCanvas(id: Id, name: string): Promise<Canvas>;
  setDefaultEntrypoint(canvasId: Id, nodeId: Id): Promise<Canvas>;
  saveRevision(canvasId: Id, expectedDraftRevision?: number): Promise<CanvasRevision>;
  startRun(input: StartRunInput): Promise<Run>;
  events(afterGlobalPosition: number, limit?: number): Promise<HostEventBatch>;
  subscribe(listener: (snapshot: HostSnapshot) => void): () => void;
}

const key = "seekwd.vertical-slice.v1";
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const seed = (): HostSnapshot => {
  const workspace: Workspace = { id: "ws_thesis", name: "Thesis Workspace", path: "D:/Documents/Thesis", updatedAt: now() };
  const canvas: Canvas = { id: "canvas_citation", workspaceId: workspace.id, name: "Citation Review", status: "idle", defaultEntrypointNodeId: "node_start", revision: 3, draftRevision: 0, draftDirty: false, updatedAt: now() };
  const node: CanvasNode = { id: "node_start", canvasId: canvas.id, name: "Start", kind: "trigger.start" };
  return { snapshotVersion: 1, workspaces: [workspace], canvases: [canvas], nodes: [node], revisions: [{ id: "rev_citation_3", canvasId: canvas.id, revision: 3, createdAt: now(), createdBy: "user", status: "validated", contentDigest: "sha256:" + "0".repeat(64), graphJson: JSON.stringify({ nodes: [node], edges: [] }) }], runs: [], notifications: [] };
};

export function createLocalHostClient(): HostClient {
  const stored = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<HostSnapshot> | null;
  let state: HostSnapshot = stored
    ? { snapshotVersion: stored.snapshotVersion ?? 1, workspaces: stored.workspaces ?? [], canvases: (stored.canvases ?? []).map((canvas) => ({ ...canvas, draftRevision: canvas.draftRevision ?? 0, draftDirty: canvas.draftDirty ?? false })), nodes: stored.nodes ?? [], revisions: (stored.revisions ?? []).map((revision) => ({ ...revision, contentDigest: revision.contentDigest ?? "sha256:" + "0".repeat(64), graphJson: revision.graphJson ?? JSON.stringify({ nodes: [], edges: [] }) })), runs: (stored.runs ?? []).map((run) => ({ ...run, finishedAt: run.finishedAt ?? null })), notifications: (stored.notifications ?? []).map((notification) => ({ ...notification, runId: notification.runId ?? null, canvasId: notification.canvasId ?? null })) }
    : seed();
  const listeners = new Set<(snapshot: HostSnapshot) => void>();
  let localGlobalPosition = 0;
  const commit = () => { state.snapshotVersion += 1; localGlobalPosition += 1; localStorage.setItem(key, JSON.stringify(state)); listeners.forEach((listener) => listener(structuredClone(state))); };
  const workspace = (id: Id) => state.workspaces.find((item) => item.id === id);
  const canvas = (id: Id) => state.canvases.find((item) => item.id === id);
  const client: HostClient = {
    async snapshot() { return structuredClone(state); },
    async createWorkspace(input) { const item: Workspace = { id: uid("ws"), name: input.name.trim(), path: input.path.trim(), updatedAt: now() }; if (!item.name) throw new Error("Workspace name is required"); state.workspaces.push(item); commit(); return structuredClone(item); },
    async renameWorkspace(id, name) { const item = workspace(id); if (!item) throw new Error("Workspace not found"); item.name = name.trim(); item.updatedAt = now(); commit(); return structuredClone(item); },
    async createCanvas(input) { if (!workspace(input.workspaceId)) throw new Error("Workspace not found"); const node: CanvasNode = { id: uid("node"), canvasId: "pending", name: "Start", kind: "trigger.start" }; const item: Canvas = { id: uid("canvas"), workspaceId: input.workspaceId, name: input.name.trim() || "Untitled Canvas", status: "idle", defaultEntrypointNodeId: node.id, revision: 0, draftRevision: 0, draftDirty: false, updatedAt: now() }; node.canvasId = item.id; state.canvases.push(item); state.nodes.push(node); commit(); return structuredClone(item); },
    async renameCanvas(id, name) { const item = canvas(id); if (!item) throw new Error("Canvas not found"); item.name = name.trim(); item.updatedAt = now(); commit(); return structuredClone(item); },
    async setDefaultEntrypoint(canvasId, nodeId) { const item = canvas(canvasId); if (!item) throw new Error("Canvas not found"); if (!state.nodes.some((node) => node.id === nodeId && node.canvasId === canvasId)) throw new Error("Entrypoint node not found"); item.defaultEntrypointNodeId = nodeId; item.updatedAt = now(); commit(); return structuredClone(item); },
    async saveRevision(canvasId, expectedDraftRevision) { const item = canvas(canvasId); if (!item) throw new Error("Canvas not found"); if (expectedDraftRevision !== undefined && expectedDraftRevision !== item.draftRevision) throw new Error("Draft revision is stale"); item.revision += 1; item.draftDirty = false; item.updatedAt = now(); const graphJson = JSON.stringify({ nodes: state.nodes.filter((node) => node.canvasId === canvasId), edges: [] }); const revision: CanvasRevision = { id: uid("revision"), canvasId, revision: item.revision, createdAt: now(), createdBy: "user", status: "debug", contentDigest: "sha256:" + "0".repeat(64), graphJson }; state.revisions.push(revision); commit(); return structuredClone(revision); },
    async startRun(input) { const item = canvas(input.canvasId); if (!item) throw new Error("Canvas not found"); if (!item.defaultEntrypointNodeId) throw new Error("A default entrypoint is required"); if (input.revision !== item.revision) throw new Error("Revision is stale"); const run: Run = { id: uid("run"), canvasId: item.id, revision: input.revision, status: "running", startedAt: now(), finishedAt: null }; item.status = "running"; state.runs.unshift(run); commit(); window.setTimeout(() => { const current = state.runs.find((candidate) => candidate.id === run.id); const currentCanvas = canvas(item.id); if (!current || !currentCanvas || current.status !== "running") return; current.status = "succeeded"; current.finishedAt = now(); currentCanvas.status = "succeeded"; const notification: Notification = { id: uid("notification"), title: "Run completed", message: `${currentCanvas.name} completed successfully.`, severity: "success", createdAt: now(), canvasId: currentCanvas.id, runId: current.id }; state.notifications.unshift(notification); commit(); }, 1600); return structuredClone(run); },
    events: async (afterGlobalPosition, limit = 100) => { const next = afterGlobalPosition < localGlobalPosition ? Math.min(localGlobalPosition, afterGlobalPosition + Math.max(1, limit)) : afterGlobalPosition; return { events: next > afterGlobalPosition ? [{ eventId: uid("event"), eventType: "projection.snapshot.updated" as const, globalPosition: next, snapshotVersion: state.snapshotVersion, occurredAt: now() }] : [], nextGlobalPosition: next, snapshotVersion: state.snapshotVersion }; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return client;
}

export function createHttpHostClient(baseUrl = "http://127.0.0.1:4317"): HostClient {
  const root = baseUrl.replace(/\/$/, "");
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${root}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
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
    return response.json() as Promise<T>;
  };
  const client: HostClient = {
    snapshot: () => request<HostSnapshot>("/api/snapshot"),
    createWorkspace: (input) => request<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(input) }),
    renameWorkspace: (id, name) => request<Workspace>(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    createCanvas: (input) => request<Canvas>(`/api/workspaces/${input.workspaceId}/canvases`, { method: "POST", body: JSON.stringify(input) }),
    renameCanvas: (id, name) => request<Canvas>(`/api/canvases/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    setDefaultEntrypoint: (canvasId, nodeId) => request<Canvas>(`/api/canvases/${canvasId}/entrypoint`, { method: "PUT", body: JSON.stringify({ nodeId }) }),
    saveRevision: (canvasId, expectedDraftRevision) => request<CanvasRevision>(`/api/canvases/${canvasId}/revisions`, { method: "POST", body: JSON.stringify(expectedDraftRevision === undefined ? {} : { expectedDraftRevision }) }),
    startRun: ({ canvasId, ...body }) => request<Run>(`/api/canvases/${canvasId}/runs`, { method: "POST", body: JSON.stringify(body) }),
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
