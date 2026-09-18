export type RuntimeState =
  | "idle"
  | "running"
  | "waiting"
  | "success"
  | "error"
  | "paused"
  | "cancelled";

export type PortDirection = "input" | "output";
export type PortKind = "data" | "flow" | "event" | "resource";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Workspace {
  id: string;
  name: string;
  path: string;
  status: RuntimeState;
  canvasIds: string[];
  recentCanvasIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Canvas {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: RuntimeState;
  primaryNodeId: string | null;
  nodeIds: string[];
  edgeIds: string[];
  latestRunId?: string;
  updatedAt: string;
}

export interface NodePosition { x: number; y: number }

export interface Node {
  id: string;
  canvasId: string;
  name: string;
  type: string;
  typeLabel: string;
  state: RuntimeState;
  primary: boolean;
  position: NodePosition;
  inputPortIds: string[];
  outputPortIds: string[];
  config: Record<string, unknown>;
  disabled?: boolean;
}

export interface Port {
  id: string;
  nodeId: string;
  direction: PortDirection;
  name: string;
  valueType: string;
  kind: PortKind;
  required?: boolean;
  connectionCount: number;
}

export interface Edge {
  id: string;
  canvasId: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  kind: PortKind;
  label?: string;
  enabled: boolean;
}

export interface CanvasGraph {
  canvas: Canvas;
  nodes: Node[];
  ports: Port[];
  edges: Edge[];
  revision: number;
}

export interface RunError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface RunLog {
  id: string;
  runId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  nodeId?: string;
}

export interface Artifact {
  id: string;
  name: string;
  kind: "file" | "directory" | "text" | "json";
  mimeType?: string;
  size?: number;
  createdAt: string;
  nodeId?: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
}

export interface InputRequest {
  id: string;
  nodeId: string;
  label: string;
  valueType: string;
  required: boolean;
  status: "pending" | "provided" | "skipped";
}

export interface NodeRun {
  id: string;
  runId: string;
  canvasId: string;
  nodeId: string;
  state: RuntimeState;
  startedAt?: string;
  finishedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: RunError;
}

export interface RunSession {
  id: string;
  workspaceId: string;
  rootCanvasId: string;
  state: RuntimeState;
  startedAt: string;
  finishedAt?: string;
  currentNodeId?: string;
  nodeRuns: NodeRun[];
  logs: RunLog[];
  artifacts: Artifact[];
  approvals: ApprovalRequest[];
  inputRequests: InputRequest[];
  error?: RunError;
}

export interface NotificationItem {
  id: string;
  severity: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  workspaceId?: string;
  canvasId?: string;
  runId?: string;
  action?: { label: string; command: string };
  createdAt: string;
}

export interface CreateWorkspaceInput { name: string; path: string }
export interface CreateCanvasInput { workspaceId: string; name: string; description?: string }
export interface AddNodeInput {
  canvasId: string;
  name: string;
  type?: string;
  typeLabel?: string;
  position?: NodePosition;
  config?: Record<string, unknown>;
}
export interface NodePatch {
  name?: string;
  state?: RuntimeState;
  position?: NodePosition;
  config?: Record<string, unknown>;
  disabled?: boolean;
}
export interface CreateEdgeInput {
  canvasId: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  kind?: PortKind;
  label?: string;
}

export interface DeleteImpact {
  objectId: string;
  objectType: "workspace" | "canvas" | "node";
  affectedCanvasIds: string[];
  affectedNodeIds: string[];
  affectedRunIds: string[];
  references: number;
}

export type RunScope =
  | { type: "canvas"; canvasId: string }
  | { type: "workspace"; workspaceId: string };

export type RuntimeEvent =
  | { type: "workspace.updated"; workspace: Workspace }
  | { type: "canvas.updated"; canvas: Canvas }
  | { type: "node.updated"; node: Node }
  | { type: "run.created"; run: RunSession }
  | { type: "run.updated"; run: RunSession }
  | { type: "node-run.updated"; nodeRun: NodeRun }
  | { type: "notification.created"; notification: NotificationItem }
  | { type: "notification.dismissed"; notificationId: string };

export interface SeekwdApi {
  listWorkspaces(): Promise<Workspace[]>;
  getWorkspace(workspaceId: string): Promise<Workspace>;
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  renameWorkspace(workspaceId: string, name: string): Promise<Workspace>;
  deleteWorkspace(workspaceId: string): Promise<DeleteImpact>;
  listCanvases(workspaceId: string): Promise<Canvas[]>;
  getCanvas(canvasId: string): Promise<Canvas>;
  createCanvas(input: CreateCanvasInput): Promise<Canvas>;
  renameCanvas(canvasId: string, name: string): Promise<Canvas>;
  deleteCanvas(canvasId: string): Promise<DeleteImpact>;
  getCanvasGraph(canvasId: string): Promise<CanvasGraph>;
  addNode(input: AddNodeInput): Promise<Node>;
  updateNode(nodeId: string, patch: NodePatch): Promise<Node>;
  deleteNode(nodeId: string): Promise<DeleteImpact>;
  setPrimaryNode(canvasId: string, nodeId: string): Promise<Canvas>;
  connectNodes(input: CreateEdgeInput): Promise<Edge>;
  disconnectNodes(edgeId: string): Promise<void>;
  listRuns(scope: RunScope): Promise<RunSession[]>;
  getRun(runId: string): Promise<RunSession>;
  startRun(canvasId: string): Promise<RunSession>;
  pauseRun(runId: string): Promise<void>;
  resumeRun(runId: string): Promise<void>;
  cancelRun(runId: string): Promise<void>;
  retryRun(runId: string): Promise<RunSession>;
  listNotifications(): Promise<NotificationItem[]>;
  dismissNotification(notificationId: string): Promise<void>;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
}

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
  }
}
