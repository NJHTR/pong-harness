# UI Mock Data and API Contract

> Compatibility note: this mock boundary follows the normative identity, entrypoint, state and execution contracts in [27-normative-contracts](../27-normative-contracts/00-README.md). It may use in-memory data, but it must not simplify those contracts into a different frontend-only model.

This document defines the frontend contract used by the UI Lab before a Host or backend exists. The mock adapter is intentionally shaped like the future IPC/API boundary: pages call commands and queries, never mutate domain objects directly.

## Scope and ownership

```text
Workspace
  local directory, permission boundary, canvases, recent items
Canvas
  identity, mutable draft, immutable revisions, releases, entrypoints, triggers
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
setDefaultEntrypointTarget(
  canvasId: string,
  entrypointId: string,
  nodeId: string
): Promise<CanvasDraft>
connectNodes(input: CreateEdgeInput): Promise<Edge>
disconnectNodes(edgeId: string): Promise<void>
```

`setDefaultEntrypointTarget` is atomic for the draft revision. A revision has exactly one default entrypoint and may have additional named entrypoints and trigger bindings. Deleting an entrypoint target requires an impact preview; the command either rebinds/removes affected entrypoints in the same patch or fails without partially mutating the graph.

### Runtime and notifications

```ts
listRuns(scope: RunScope): Promise<RunSession[]>
getRun(runId: string): Promise<RunSession>
startRun(input: StartRunInput): Promise<RunSession>
pauseRun(runId: string): Promise<void>
resumeRun(runId: string): Promise<void>
cancelRun(runId: string): Promise<void>
retryRun(runId: string): Promise<RunSession>

listNotifications(): Promise<NotificationItem[]>
dismissNotification(notificationId: string): Promise<void>
subscribe(listener: (event: RuntimeEvent) => void): () => void
```

真实适配器的订阅必须接受 `consumerId` 和恢复游标，并暴露 `getProjectionSnapshot`；上述无参数 `subscribe` 仅是 UI Lab 便捷封装，不得成为 IPC 正式合同。

```ts
interface StartRunInput {
  canvasId: string;
  revisionId?: string;
  releaseId?: string;
  entrypointId?: string;
  inputBindings: Record<string, ValueRef>;
  executionMode: "debug" | "release";
  authorityProfileId?: string;
  idempotencyKey: string;
}
```

Exactly one of `revisionId` or `releaseId` is required. `debug` requires an immutable Revision; `release` requires a Release. Omitting `entrypointId` selects the revision's default entrypoint. Starting from a mutable Draft is forbidden.

`RunSession` is the source for Run History, Run Output, canvas status, node progress and completion notifications. A workspace execution session can reference multiple canvas IDs, but a canvas-local run remains traceable from the originating canvas.

## Data requirements by screen

| UI surface | Required data | Commands | Empty/loading/error state |
|---|---|---|---|
| Workspace tree | workspace name/path/status, canvas IDs, recent IDs | create/rename/delete workspace | no workspace, loading tree, stale snapshot |
| Canvas tabs | canvas name/status/updated time | create/rename/delete canvas | no canvas, deleted target |
| Graph | nodes, ports, edges, default/named entrypoints, triggers, draft revision | add/update/delete node, connect/disconnect, edit entrypoint | graph loading, invalid graph, conflict |
| Inspector | selected node config, schema, port list, validation | update node | no selection, locked node, invalid field |
| Run toolbar | revision/release, default and named entrypoints, runnable reason, latest run ID, authority profile | start/pause/resume/cancel | unsaved draft, no default entrypoint, invalid input, waiting approval |
| Run history | run summary, start/end, state, trigger | retry/open run | no runs, history unavailable |
| Run output | logs, node runs, input/output refs, errors, artifacts | cancel/retry/open artifact | waiting input, stream reconnect |
| Notifications | severity, title, target IDs, action | dismiss/open target | no notifications |

## Runtime event contract

Events are incremental UI updates, not the only persistence mechanism. The real transport must support a cursor and snapshot resync; the mock adapter emits the same event names locally.

```ts
interface RuntimeEventEnvelope<TType extends string, TPayload> {
  type: TType;
  eventId: string;
  aggregateId: string;
  aggregateSequence: number;
  globalPosition: number;
  correlationId: string;
  occurredAt: string;
  payload: TPayload;
}

type RuntimeEvent =
  | RuntimeEventEnvelope<"workspace.updated", { workspace: Workspace }>
  | RuntimeEventEnvelope<"canvas.updated", { canvas: Canvas }>
  | RuntimeEventEnvelope<"node.updated", { node: Node }>
  | RuntimeEventEnvelope<"run.created", { run: RunSession }>
  | RuntimeEventEnvelope<"run.updated", { run: RunSession }>
  | RuntimeEventEnvelope<"node-run.updated", { nodeRun: NodeRun }>
  | RuntimeEventEnvelope<"notification.created", { notification: NotificationItem }>
  | RuntimeEventEnvelope<"notification.dismissed", { notificationId: string }>;
```

Mock 事件也必须带稳定 `eventId`、`aggregateSequence`、`globalPosition`、`correlationId` 和 `occurredAt` 信封。UI must treat unknown event fields as forward-compatible and recover after a dropped event by re-querying the affected aggregate. 正式传输和恢复语义以 [11-command-event-recovery.md](../27-normative-contracts/11-command-event-recovery.md) 为准。

## Mock behavior

- Seed three workspaces, several canvases, a draft plus immutable revisions, default and named entrypoints, triggers, ports and edges, and representative terminal, waiting and recovery states.
- `startRun` validates the immutable target, entrypoint, inputs, authority and idempotency key before creating a deterministic mock run. The run emits node progress and a notification.
- A request without a resolvable default or named entrypoint rejects with `ENTRYPOINT_NOT_FOUND`; a mutable Draft rejects with `IMMUTABLE_RUN_TARGET_REQUIRED`; invalid input, policy and authority failures use separate typed errors.
- Delete commands return a `DeleteImpact` summary before mutation in the real backend. The UI Lab uses the same shape for confirmation copy.
- IDs are stable within one browser session; timestamps are ISO strings; values and artifacts are summarized rather than embedded as large blobs.

## Backend replacement checklist

The backend adapter must preserve method names, object IDs, enum values, error codes and event semantics. It may change transport (HTTP, IPC or local worker), persistence and authorization, but it must not make components depend on database records or renderer-specific state.
