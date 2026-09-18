# UI Mock Data and API Contract

This document defines the frontend contract used by the UI Lab before a Host or backend exists. The mock adapter is intentionally shaped like the future IPC/API boundary: pages call commands and queries, never mutate domain objects directly.

## Scope and ownership

```text
Workspace
  local directory, permission boundary, canvases, recent items
Canvas
  executable graph, entry node, versions, canvas-local runs
Node / Port / Edge
  graph structure and executable configuration
RunSession
  one execution attempt, including nested canvas calls
Notification
  user-facing summary linked to a domain object
```

The UI keeps three categories separate:

1. **Domain facts**: objects returned by queries and runtime events.
2. **Commands**: typed user intent such as `startRun` or `deleteNode`.
3. **View state**: selected workspace, selected canvas, open panels, zoom and filters.

The mock implementation stores all domain facts in memory and emits events after each accepted command. A future backend can replace the adapter without changing feature components.

## Required query and command surface

### Workspace and canvas

```ts
listWorkspaces(): Promise<Workspace[]>
getWorkspace(workspaceId: string): Promise<Workspace>
createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>
renameWorkspace(workspaceId: string, name: string): Promise<Workspace>
deleteWorkspace(workspaceId: string): Promise<DeleteImpact>

listCanvases(workspaceId: string): Promise<Canvas[]>
getCanvas(canvasId: string): Promise<Canvas>
createCanvas(input: CreateCanvasInput): Promise<Canvas>
renameCanvas(canvasId: string, name: string): Promise<Canvas>
deleteCanvas(canvasId: string): Promise<DeleteImpact>
```

### Graph editing

```ts
getCanvasGraph(canvasId: string): Promise<CanvasGraph>
addNode(input: AddNodeInput): Promise<Node>
updateNode(nodeId: string, patch: NodePatch): Promise<Node>
deleteNode(nodeId: string): Promise<DeleteImpact>
setPrimaryNode(canvasId: string, nodeId: string): Promise<Canvas>
connectNodes(input: CreateEdgeInput): Promise<Edge>
disconnectNodes(edgeId: string): Promise<void>
```

`setPrimaryNode` is atomic: after it resolves, exactly one node is primary. Deleting a primary node clears `primaryNodeId` and makes the canvas non-runnable until another node is selected.

### Runtime and notifications

```ts
listRuns(scope: RunScope): Promise<RunSession[]>
getRun(runId: string): Promise<RunSession>
startRun(canvasId: string): Promise<RunSession>
pauseRun(runId: string): Promise<void>
resumeRun(runId: string): Promise<void>
cancelRun(runId: string): Promise<void>
retryRun(runId: string): Promise<RunSession>

listNotifications(): Promise<NotificationItem[]>
dismissNotification(notificationId: string): Promise<void>
subscribe(listener: (event: RuntimeEvent) => void): () => void
```

`RunSession` is the source for Run History, Run Output, canvas status, node progress and completion notifications. A workspace execution session can reference multiple canvas IDs, but a canvas-local run remains traceable from the originating canvas.

## Data requirements by screen

| UI surface | Required data | Commands | Empty/loading/error state |
|---|---|---|---|
| Workspace tree | workspace name/path/status, canvas IDs, recent IDs | create/rename/delete workspace | no workspace, loading tree, stale snapshot |
| Canvas tabs | canvas name/status/updated time | create/rename/delete canvas | no canvas, deleted target |
| Graph | nodes, ports, edges, entry node, graph revision | add/update/delete node, connect/disconnect | graph loading, invalid graph, conflict |
| Inspector | selected node config, schema, port list, validation | update node | no selection, locked node, invalid field |
| Run toolbar | canvas status, runnable reason, latest run ID | start/pause/resume/cancel | no entry node, waiting approval |
| Run history | run summary, start/end, state, trigger | retry/open run | no runs, history unavailable |
| Run output | logs, node runs, input/output refs, errors, artifacts | cancel/retry/open artifact | waiting input, stream reconnect |
| Notifications | severity, title, target IDs, action | dismiss/open target | no notifications |

## Runtime event contract

Events are incremental UI updates, not the only persistence mechanism. The real transport must support a cursor and snapshot resync; the mock adapter emits the same event names locally.

```ts
type RuntimeEvent =
  | { type: "workspace.updated"; workspace: Workspace }
  | { type: "canvas.updated"; canvas: Canvas }
  | { type: "node.updated"; node: Node }
  | { type: "run.created"; run: RunSession }
  | { type: "run.updated"; run: RunSession }
  | { type: "node-run.updated"; nodeRun: NodeRun }
  | { type: "notification.created"; notification: NotificationItem }
  | { type: "notification.dismissed"; notificationId: string };
```

The UI must treat unknown event fields as forward-compatible and recover after a dropped event by re-querying the affected aggregate.

## Mock behavior

- Seed three workspaces, several canvases, a graph with one entry node, ports and edges, and representative completed/running/waiting/error runs.
- `startRun` creates a new run and moves it through `running` to `success` on a short deterministic timer. The run emits node progress and a notification.
- A canvas without `primaryNodeId` rejects `startRun` with a typed `NOT_RUNNABLE` error.
- Delete commands return a `DeleteImpact` summary before mutation in the real backend. The UI Lab uses the same shape for confirmation copy.
- IDs are stable within one browser session; timestamps are ISO strings; values and artifacts are summarized rather than embedded as large blobs.

## Backend replacement checklist

The backend adapter must preserve method names, object IDs, enum values, error codes and event semantics. It may change transport (HTTP, IPC or local worker), persistence and authorization, but it must not make components depend on database records or renderer-specific state.

