import type { Artifact, Canvas, Edge, Node, NotificationItem, Port, RunSession, Workspace } from "./types";

const now = "2026-09-18T14:00:00.000Z";

export const mockWorkspaces: Workspace[] = [
  { id: "ws-thesis", name: "Thesis Workspace", path: "D:\\Documents\\Thesis", status: "running", canvasIds: ["canvas-experiment", "canvas-source", "canvas-citation"], recentCanvasIds: ["canvas-citation", "canvas-experiment"], createdAt: now, updatedAt: now },
  { id: "ws-research", name: "Research Workspace", path: "D:\\Documents\\Research", status: "success", canvasIds: ["canvas-literature", "canvas-evaluation"], recentCanvasIds: ["canvas-literature"], createdAt: now, updatedAt: now },
  { id: "ws-openmaic", name: "OpenMAIC", path: "D:\\bs\\seekwd\\OpenMAIC", status: "waiting", canvasIds: ["canvas-java"], recentCanvasIds: ["canvas-java"], createdAt: now, updatedAt: now },
];

export const mockCanvases: Canvas[] = [
  { id: "canvas-experiment", workspaceId: "ws-thesis", name: "Experiment Report", description: "Draft an experiment report from topic and source material.", status: "idle", primaryNodeId: "node-topic", nodeIds: ["node-topic", "node-draft", "node-review"], edgeIds: ["edge-topic-draft", "edge-draft-review"], updatedAt: now },
  { id: "canvas-source", workspaceId: "ws-thesis", name: "Source Analysis", status: "error", primaryNodeId: "node-source", nodeIds: ["node-source"], edgeIds: [], updatedAt: now },
  { id: "canvas-citation", workspaceId: "ws-thesis", name: "Citation Review", status: "running", primaryNodeId: "node-citation", nodeIds: ["node-citation", "node-citation-check"], edgeIds: ["edge-citation-check"], latestRunId: "run-citation", updatedAt: now },
  { id: "canvas-literature", workspaceId: "ws-research", name: "Literature Survey", status: "success", primaryNodeId: "node-literature", nodeIds: ["node-literature"], edgeIds: [], latestRunId: "run-literature", updatedAt: now },
  { id: "canvas-evaluation", workspaceId: "ws-research", name: "Evaluation Plan", status: "idle", primaryNodeId: null, nodeIds: ["node-evaluation"], edgeIds: [], updatedAt: now },
  { id: "canvas-java", workspaceId: "ws-openmaic", name: "Java Course", status: "waiting", primaryNodeId: "node-java", nodeIds: ["node-java"], edgeIds: [], updatedAt: now },
];

export const mockNodes: Node[] = [
  { id: "node-topic", canvasId: "canvas-experiment", name: "Research Topic", type: "text.input", typeLabel: "Text input", state: "success", primary: true, position: { x: 90, y: 90 }, inputPortIds: [], outputPortIds: ["port-topic-text"], config: { value: "How does human review improve agent workflows?" } },
  { id: "node-draft", canvasId: "canvas-experiment", name: "Draft Experiment Report", type: "agent.task", typeLabel: "Agent task", state: "running", primary: false, position: { x: 380, y: 130 }, inputPortIds: ["port-draft-topic"], outputPortIds: ["port-draft-report", "port-draft-sources"], config: { mode: "collaborative", repairOnFailure: true } },
  { id: "node-review", canvasId: "canvas-experiment", name: "Review Report Structure", type: "human.approval", typeLabel: "Human input", state: "waiting", primary: false, position: { x: 690, y: 190 }, inputPortIds: ["port-review-draft"], outputPortIds: ["port-review-approved"], config: {} },
  { id: "node-source", canvasId: "canvas-source", name: "Source Parser", type: "file.parse", typeLabel: "File parser", state: "error", primary: true, position: { x: 160, y: 120 }, inputPortIds: ["port-source-file"], outputPortIds: [], config: { format: "docx" } },
  { id: "node-citation", canvasId: "canvas-citation", name: "Citation Review", type: "agent.task", typeLabel: "Agent task", state: "running", primary: true, position: { x: 120, y: 130 }, inputPortIds: [], outputPortIds: ["port-citation-list"], config: {} },
  { id: "node-citation-check", canvasId: "canvas-citation", name: "Check Sources", type: "verification.check", typeLabel: "Verification", state: "running", primary: false, position: { x: 460, y: 130 }, inputPortIds: ["port-citation-input"], outputPortIds: [], config: {} },
  { id: "node-literature", canvasId: "canvas-literature", name: "Literature Survey", type: "agent.task", typeLabel: "Agent task", state: "success", primary: true, position: { x: 160, y: 120 }, inputPortIds: [], outputPortIds: [], config: {} },
  { id: "node-evaluation", canvasId: "canvas-evaluation", name: "Evaluation Matrix", type: "data.table", typeLabel: "Data table", state: "idle", primary: false, position: { x: 180, y: 120 }, inputPortIds: [], outputPortIds: [], config: {} },
  { id: "node-java", canvasId: "canvas-java", name: "Generate Java Course", type: "agent.task", typeLabel: "Agent task", state: "waiting", primary: true, position: { x: 180, y: 120 }, inputPortIds: [], outputPortIds: [], config: {} },
];

export const mockPorts: Port[] = [
  { id: "port-topic-text", nodeId: "node-topic", direction: "output", name: "Topic", valueType: "string", kind: "data", connectionCount: 1 },
  { id: "port-draft-topic", nodeId: "node-draft", direction: "input", name: "Topic", valueType: "string", kind: "data", required: true, connectionCount: 1 },
  { id: "port-draft-report", nodeId: "node-draft", direction: "output", name: "Draft", valueType: "document", kind: "data", connectionCount: 1 },
  { id: "port-draft-sources", nodeId: "node-draft", direction: "output", name: "Sources", valueType: "artifact[]", kind: "resource", connectionCount: 0 },
  { id: "port-review-draft", nodeId: "node-review", direction: "input", name: "Draft", valueType: "document", kind: "data", required: true, connectionCount: 1 },
  { id: "port-review-approved", nodeId: "node-review", direction: "output", name: "Approved", valueType: "boolean", kind: "event", connectionCount: 0 },
  { id: "port-source-file", nodeId: "node-source", direction: "input", name: "File", valueType: "artifact", kind: "resource", required: true, connectionCount: 0 },
  { id: "port-citation-list", nodeId: "node-citation", direction: "output", name: "Citations", valueType: "citation[]", kind: "data", connectionCount: 1 },
  { id: "port-citation-input", nodeId: "node-citation-check", direction: "input", name: "Citations", valueType: "citation[]", kind: "data", connectionCount: 1 },
];

export const mockEdges: Edge[] = [
  { id: "edge-topic-draft", canvasId: "canvas-experiment", sourceNodeId: "node-topic", sourcePortId: "port-topic-text", targetNodeId: "node-draft", targetPortId: "port-draft-topic", kind: "data", enabled: true },
  { id: "edge-draft-review", canvasId: "canvas-experiment", sourceNodeId: "node-draft", sourcePortId: "port-draft-report", targetNodeId: "node-review", targetPortId: "port-review-draft", kind: "data", enabled: true },
  { id: "edge-citation-check", canvasId: "canvas-citation", sourceNodeId: "node-citation", sourcePortId: "port-citation-list", targetNodeId: "node-citation-check", targetPortId: "port-citation-input", kind: "data", enabled: true },
];

const artifact: Artifact = { id: "artifact-report", name: "experiment-report.docx", kind: "file", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 18432, createdAt: now, nodeId: "node-draft" };
export const mockRuns: RunSession[] = [
  { id: "run-citation", workspaceId: "ws-thesis", rootCanvasId: "canvas-citation", state: "running", startedAt: now, currentNodeId: "node-citation-check", nodeRuns: [], logs: [{ id: "log-citation", runId: "run-citation", timestamp: now, level: "info", message: "Checking citation references", nodeId: "node-citation-check" }], artifacts: [], approvals: [], inputRequests: [] },
  { id: "run-literature", workspaceId: "ws-research", rootCanvasId: "canvas-literature", state: "success", startedAt: now, finishedAt: now, nodeRuns: [], logs: [{ id: "log-literature", runId: "run-literature", timestamp: now, level: "info", message: "Literature survey completed" }], artifacts: [artifact], approvals: [], inputRequests: [] },
];

export const mockNotifications: NotificationItem[] = [
  { id: "notification-citation", severity: "info", title: "Canvas is running", message: "Citation Review is checking sources.", workspaceId: "ws-thesis", canvasId: "canvas-citation", runId: "run-citation", createdAt: now, action: { label: "Open output", command: "open-run-output" } },
];
