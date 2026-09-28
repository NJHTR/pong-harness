import { StrictMode, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  ArrowUpFromLine,
  Bell,
  Blocks,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CirclePlay,
  Clock3,
  Code2,
  Database,
  ExternalLink,
  FileCode2,
  FileText,
  FileSearch,
  Folder,
  FolderOpen,
  FolderPlus,
  History,
  KeyRound,
  LoaderCircle,
  MoreHorizontal,
  PanelBottom,
  PanelRight,
  PanelsTopLeft,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TriangleAlert,
  Type,
  UserRoundCog,
  X,
  Zap,
} from "lucide-react";
import { createHttpHostClient, createLocalHostClient, toRuntimeGraphDocument, type HostClient } from "@seekwd/client";
import type { Canvas, CanvasEdge, CanvasNode as WireNode, HostSnapshot, Run, Workspace } from "@seekwd/protocol-schema";
import { validateRuntimeGraph } from "@seekwd/protocol-schema";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import {
  Button,
  AutoGrowTextArea,
  CanvasNode,
  Dialog,
  IconButton,
  InspectorSection,
  Menu,
  Notification,
  PanelHeader,
  PropertyRow,
  SidebarItem,
  SegmentedControl,
  StatusBadge,
  Switch,
  TextField,
  Toolbar,
  Tooltip,
  WindowFrame,
} from "@seekwd/ui";
import "@seekwd/ui/styles.css";
import "./workbench.css";

const nativeWindow = getCurrentWindow();

type Surface = "canvas" | "automations" | "extensions" | "settings" | "files" | "environments" | "agents";
type RuntimeState = "idle" | "running" | "waiting" | "success" | "error";
type PortKind = "data" | "flow" | "event" | "resource";
type RenameTarget = { kind: "workspace" | "canvas" | "node"; id: string; name: string };
type DeleteTarget = { kind: "workspace" | "canvas" | "node" | "edge"; id: string; name: string; description: string };

interface Notice {
  id: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "error";
}

interface SettingsState {
  compactSidebar: boolean;
  reduceMotion: boolean;
  notifySuccess: boolean;
  notifyFailure: boolean;
  allowBackgroundRuns: boolean;
  confirmDestructive: boolean;
  defaultProjectParent: string;
}

interface AgentSettings {
  name: string;
  endpoint: string;
  model: string;
  environment: string;
  instructions: string;
}

interface GraphValidation {
  valid: boolean;
  message: string;
}

const emptySnapshot: HostSnapshot = {
  snapshotVersion: 0,
  workspaces: [],
  canvases: [],
  nodes: [],
  edges: [],
  revisions: [],
  runs: [],
  notifications: [],
};

function App({ client }: { client: HostClient }) {
  const [snapshot, setSnapshot] = useState<HostSnapshot>(emptySnapshot);
  const [workspaceId, setWorkspaceId] = useState<string>();
  const [canvasId, setCanvasId] = useState<string>();
  const [openCanvasIds, setOpenCanvasIds] = useState<string[]>([]);
  const [surface, setSurface] = useState<Surface>("canvas");
  const [workspacesOpen, setWorkspacesOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [expandedCanvases, setExpandedCanvases] = useState<Record<string, boolean>>({});
  const [nodeLibraryOpen, setNodeLibraryOpen] = useState(false);
  const [runHistoryOpen, setRunHistoryOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [runInputValue, setRunInputValue] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [connectionSource, setConnectionSource] = useState<{ nodeId: string; portId: string; kind: PortKind } | null>(null);
  const [nodeConfigDrafts, setNodeConfigDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const pendingNodeConfigs = useRef(new Map<string, Record<string, unknown>>());
  const nodeConfigTimers = useRef(new Map<string, number>());
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notificationsHydrated, setNotificationsHydrated] = useState(false);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const [renameTarget, setRenameTarget] = useState<RenameTarget>();
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"create" | "open">("create");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceParentPath, setWorkspaceParentPath] = useState("");
  const [workspaceCreateConfirmation, setWorkspaceCreateConfirmation] = useState<{ name: string; parentPath: string }>();
  const [pendingWorkspace, setPendingWorkspace] = useState<{ name: string; path: string }>();
  const [composerScopeEnabled, setComposerScopeEnabled] = useState(true);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>({
    name: "Local Agent",
    endpoint: "",
    model: "",
    environment: "Response only",
    instructions: "",
  });
  const [agentKeyConfigured, setAgentKeyConfigured] = useState(false);
  const [agentResponse, setAgentResponse] = useState("");
  const [portDialogNodeId, setPortDialogNodeId] = useState<string>();
  const [portName, setPortName] = useState("");
  const [portDirection, setPortDirection] = useState<"input" | "output">("input");
  const [portKind, setPortKind] = useState<PortKind>("data");
  const [settings, setSettings] = useState<SettingsState>({
    compactSidebar: false,
    reduceMotion: false,
    notifySuccess: true,
    notifyFailure: true,
    allowBackgroundRuns: false,
    confirmDestructive: true,
    defaultProjectParent: "",
  });

  const activeWorkspace = snapshot.workspaces.find((item) => item.id === workspaceId) ?? snapshot.workspaces[0];
  const activeCanvas = snapshot.canvases.find((item) => item.id === canvasId)
    ?? snapshot.canvases.find((item) => item.workspaceId === activeWorkspace?.id);
  const canvasNodes = useMemo(
    () => (activeCanvas
      ? snapshot.nodes
        .filter((node) => node.canvasId === activeCanvas.id)
        .map((node) => nodeConfigDrafts[node.id]
          ? { ...node, config: { ...(node.config ?? {}), ...nodeConfigDrafts[node.id] } }
          : node)
        .sort((left, right) => Number(right.id === activeCanvas.defaultEntrypointNodeId) - Number(left.id === activeCanvas.defaultEntrypointNodeId))
      : []),
    [activeCanvas, nodeConfigDrafts, snapshot.nodes],
  );
  const canvasEdges = useMemo(
    () => (activeCanvas ? snapshot.edges.filter((edge) => edge.canvasId === activeCanvas.id) : []),
    [activeCanvas, snapshot.edges],
  );
  const selectedNode = canvasNodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = canvasEdges.find((edge) => edge.id === selectedEdgeId);
  const activeRun = activeCanvas
    ? snapshot.runs.find((run) => run.canvasId === activeCanvas.id && (run.status === "running" || run.status === "queued" || run.status === "waiting_input"))
    : undefined;
  const latestRun = activeCanvas
    ? snapshot.runs
      .filter((run) => run.canvasId === activeCanvas.id)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0]
    : undefined;
  const canvasRuns = useMemo(
    () => (activeCanvas ? snapshot.runs.filter((run) => run.canvasId === activeCanvas.id) : []),
    [activeCanvas, snapshot.runs],
  );
  const graphValidation = useMemo(
    () => validateCanvasGraphForUi(activeCanvas, canvasNodes, canvasEdges),
    [activeCanvas, canvasNodes, canvasEdges],
  );
  const otherActiveRuns = useMemo(
    () => snapshot.runs
      .filter((run) => run.status === "running" || run.status === "queued" || run.status === "waiting_input")
      .filter((run) => run.canvasId !== activeCanvas?.id)
      .map((run) => {
        const canvas = snapshot.canvases.find((item) => item.id === run.canvasId);
        const node = snapshot.nodes.find((item) => item.id === run.currentNodeId);
        return `${canvas?.name ?? "Unknown canvas"} · ${node?.name ?? run.status}`;
      }),
    [activeCanvas?.id, snapshot.canvases, snapshot.nodes, snapshot.runs],
  );

  const showNotice = (title: string, message: string, severity: Notice["severity"] = "info") => {
    setNotices((current) => [...current, { id: `${Date.now()}-${Math.random()}`, title, message, severity }]);
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("seekwd.settings");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        setSettings((current) => ({ ...current, ...parsed }));
      }
    } catch {
      // Ignore unavailable or invalid local preferences.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("seekwd.settings", JSON.stringify(settings));
    } catch {
      // Preferences remain usable for the current session.
    }
  }, [settings]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("seekwd.agent.settings");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AgentSettings>;
        setAgentSettings((current) => ({ ...current, ...parsed }));
      }
    } catch {
      // Ignore unavailable or invalid local preferences.
    }
    void invoke<boolean>("has_agent_api_key")
      .then(setAgentKeyConfigured)
      .catch(() => setAgentKeyConfigured(false));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("seekwd.agent.settings", JSON.stringify(agentSettings));
    } catch {
      // Preferences remain usable for the current session.
    }
  }, [agentSettings]);

  const reportError = (error: unknown, fallback: string) => {
    const message = typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String(error.message)
          : fallback;
    showNotice("Action failed", message || fallback, "error");
  };

  const flushNodeConfig = async (nodeId: string) => {
    const config = pendingNodeConfigs.current.get(nodeId);
    if (!config) return;
    const timer = nodeConfigTimers.current.get(nodeId);
    if (timer !== undefined) window.clearTimeout(timer);
    nodeConfigTimers.current.delete(nodeId);
    await client.updateNode({ nodeId, config });
    if (pendingNodeConfigs.current.get(nodeId) === config) {
      pendingNodeConfigs.current.delete(nodeId);
    }
  };

  const flushAllNodeConfigs = async () => {
    await Promise.all([...pendingNodeConfigs.current.keys()].map((nodeId) => flushNodeConfig(nodeId)));
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
    const merged = { ...(pendingNodeConfigs.current.get(nodeId) ?? {}), ...config };
    pendingNodeConfigs.current.set(nodeId, merged);
    setNodeConfigDrafts((current) => ({ ...current, [nodeId]: { ...(current[nodeId] ?? {}), ...config } }));
    const timer = nodeConfigTimers.current.get(nodeId);
    if (timer !== undefined) window.clearTimeout(timer);
    nodeConfigTimers.current.set(nodeId, window.setTimeout(() => {
      void flushNodeConfig(nodeId).catch((error) => reportError(error, "Unable to save node input"));
    }, 350));
  };

  const requestDeleteNode = (nodeId: string) => {
    const node = snapshot.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    setDeleteTarget({ kind: "node", id: nodeId, name: node.name, description: "This also removes every connection attached to the node." });
  };

  const deleteNodeById = async (nodeId: string) => {
    const node = snapshot.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    try {
      await flushNodeConfig(nodeId);
      await client.deleteNode(nodeId);
      setSelectedNodeId(undefined);
      setSelectedEdgeId(undefined);
      showNotice("Node deleted", `${node.name} and its connections were removed.`, "success");
    } catch (error) {
      reportError(error, "Unable to delete node");
    }
  };

  const requestDeleteEdge = (edgeId: string) => {
    const edge = snapshot.edges.find((candidate) => candidate.id === edgeId);
    if (!edge) return;
    setDeleteTarget({ kind: "edge", id: edgeId, name: "Connection", description: "The selected connection will be removed from this canvas." });
  };

  const deleteEdgeById = async (edgeId: string) => {
    try {
      await client.deleteEdge(edgeId);
      setSelectedEdgeId(undefined);
      showNotice("Connection deleted", "The selected connection was removed.", "success");
    } catch (error) {
      reportError(error, "Unable to delete connection");
    }
  };

  const requestDeleteCanvas = (canvas: Canvas) => {
    setDeleteTarget({ kind: "canvas", id: canvas.id, name: canvas.name, description: "This removes the canvas, its nodes, connections, revisions and run history." });
  };

  const deleteCanvasById = async (canvasIdToDelete: string) => {
    try {
      await client.deleteCanvas(canvasIdToDelete);
      setOpenCanvasIds((current) => current.filter((id) => id !== canvasIdToDelete));
      if (canvasId === canvasIdToDelete) {
        const fallback = snapshot.canvases.find((item) => item.id !== canvasIdToDelete);
        setCanvasId(fallback?.id);
        setWorkspaceId(fallback?.workspaceId ?? workspaceId);
      }
      setSelectedNodeId(undefined);
      setSelectedEdgeId(undefined);
      showNotice("Canvas deleted", "The canvas and its local data were removed.", "success");
    } catch (error) {
      reportError(error, "Unable to delete canvas");
    }
  };

  const requestDeleteWorkspace = (workspace: Workspace) => {
    setDeleteTarget({ kind: "workspace", id: workspace.id, name: workspace.name, description: "This removes the workspace and all canvases, nodes, connections and runs inside it." });
  };

  const deleteWorkspaceById = async (workspaceIdToDelete: string) => {
    try {
      await client.deleteWorkspace(workspaceIdToDelete);
      const remainingWorkspace = snapshot.workspaces.find((item) => item.id !== workspaceIdToDelete);
      const remainingCanvases = snapshot.canvases.filter((item) => item.workspaceId !== workspaceIdToDelete);
      setWorkspaceId(remainingWorkspace?.id);
      setCanvasId(remainingCanvases[0]?.id);
      setOpenCanvasIds((current) => current.filter((id) => remainingCanvases.some((canvas) => canvas.id === id)));
      setSelectedNodeId(undefined);
      setSelectedEdgeId(undefined);
      showNotice("Workspace deleted", "The workspace and its local data were removed.", "success");
    } catch (error) {
      reportError(error, "Unable to delete workspace");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(undefined);
    if (target.kind === "node") await deleteNodeById(target.id);
    if (target.kind === "edge") await deleteEdgeById(target.id);
    if (target.kind === "canvas") await deleteCanvasById(target.id);
    if (target.kind === "workspace") await deleteWorkspaceById(target.id);
  };

  useEffect(() => {
    let active = true;
    void client.snapshot().then((next) => {
      if (active) {
        setSnapshot(next);
        knownNotificationIds.current = new Set(next.notifications.map((notification) => notification.id));
        setNotificationsHydrated(true);
      }
    }).catch((error) => reportError(error, "Host connection failed"));
    const unsubscribe = client.subscribe((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    if (!workspaceId) setWorkspaceId(activeWorkspace.id);
    setExpandedWorkspaces((items) => ({ ...items, [activeWorkspace.id]: items[activeWorkspace.id] ?? true }));
  }, [activeWorkspace, workspaceId]);

  useEffect(() => {
    if (!activeCanvas) return;
    if (!canvasId) setCanvasId(activeCanvas.id);
    setOpenCanvasIds((current) => current.includes(activeCanvas.id) ? current : [...current, activeCanvas.id]);
    setExpandedCanvases((items) => ({ ...items, [activeCanvas.id]: items[activeCanvas.id] ?? true }));
    if (!selectedNodeId || !canvasNodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(activeCanvas.defaultEntrypointNodeId ?? canvasNodes[0]?.id);
    }
    if (selectedEdgeId && !canvasEdges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(undefined);
    }
  }, [activeCanvas, canvasEdges, canvasId, canvasNodes, selectedEdgeId, selectedNodeId]);

  useEffect(() => {
    if (!notificationsHydrated) return;
    const fresh = snapshot.notifications
      .filter((notification) => !knownNotificationIds.current.has(notification.id))
      .reverse();
    if (!fresh.length) return;
    fresh.forEach((notification) => knownNotificationIds.current.add(notification.id));
    setNotices((current) => [...current, ...fresh.flatMap((notification) => {
      if (notification.severity === "success" && !settings.notifySuccess) return [];
      if (notification.severity === "error" && !settings.notifyFailure) return [];
      return [{
        id: notification.id,
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
      }];
    })]);
  }, [notificationsHydrated, settings.notifyFailure, settings.notifySuccess, snapshot.notifications]);

  useEffect(() => {
    setNodeConfigDrafts((current) => {
      let changed = false;
      const next = { ...current };
      for (const [nodeId, draft] of Object.entries(current)) {
        const node = snapshot.nodes.find((candidate) => candidate.id === nodeId);
        if (!node || Object.entries(draft).every(([key, value]) => Object.is(node.config?.[key], value))) {
          if (!node) {
            delete next[nodeId];
            changed = true;
          } else if (Object.entries(draft).every(([key, value]) => Object.is(node.config?.[key], value))) {
            delete next[nodeId];
            changed = true;
          }
        }
      }
      return changed ? next : current;
    });
  }, [snapshot.nodes]);

  const selectWorkspace = (workspace: Workspace) => {
    setWorkspaceId(workspace.id);
    const firstCanvas = snapshot.canvases.find((canvas) => canvas.workspaceId === workspace.id);
    if (firstCanvas) {
      setCanvasId(firstCanvas.id);
      setOpenCanvasIds((current) => current.includes(firstCanvas.id) ? current : [...current, firstCanvas.id]);
    }
    setSurface("canvas");
  };

  const selectCanvas = (canvas: Canvas) => {
    setWorkspaceId(canvas.workspaceId);
    setCanvasId(canvas.id);
    setOpenCanvasIds((current) => current.includes(canvas.id) ? current : [...current, canvas.id]);
    setExpandedWorkspaces((current) => ({ ...current, [canvas.workspaceId]: true }));
    setExpandedCanvases((current) => ({ ...current, [canvas.id]: true }));
    setSurface("canvas");
  };

  const closeCanvasTab = (id: string) => {
    setOpenCanvasIds((current) => {
      const next = current.filter((canvasId) => canvasId !== id);
      if (canvasId === id) {
        const fallback = next[next.length - 1];
        setCanvasId(fallback);
        const fallbackCanvas = snapshot.canvases.find((canvas) => canvas.id === fallback);
        if (fallbackCanvas) setWorkspaceId(fallbackCanvas.workspaceId);
      }
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "w" && canvasId) {
        event.preventDefault();
        closeCanvasTab(canvasId);
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedEdgeId) {
        event.preventDefault();
        requestDeleteEdge(selectedEdgeId);
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeId) {
        event.preventDefault();
        requestDeleteNode(selectedNodeId);
      } else if (modifier && event.key === "Tab" && openCanvasIds.length > 1) {
        event.preventDefault();
        const index = Math.max(0, openCanvasIds.indexOf(canvasId ?? ""));
        const nextId = openCanvasIds[(index + (event.shiftKey ? -1 : 1) + openCanvasIds.length) % openCanvasIds.length];
        const nextCanvas = snapshot.canvases.find((canvas) => canvas.id === nextId);
        if (nextCanvas) selectCanvas(nextCanvas);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canvasId, openCanvasIds, selectedEdgeId, selectedNodeId, snapshot.canvases]);

  const chooseWorkspaceFolder = async () => {
    try {
      const path = await open({ directory: true, multiple: false, title: "Open Seekwd project folder" });
      if (typeof path !== "string") return;
      const name = path.split(/[\\/]/).filter(Boolean).pop() ?? "Workspace";
      if (workspaceMode === "create") {
        setWorkspaceParentPath(path);
        return;
      }
      setWorkspaceDialogOpen(false);
      setPendingWorkspace({ name, path });
    } catch (error) {
      reportError(error, "Unable to choose workspace folder");
    }
  };

  const addWorkspace = async (name: string, path: string): Promise<boolean> => {
    try {
      const existing = snapshot.workspaces.find((workspace) =>
        workspace.path.replace(/[\\/]+$/, "").toLocaleLowerCase() === path.replace(/[\\/]+$/, "").toLocaleLowerCase(),
      );
      if (existing) {
        selectWorkspace(existing);
        showNotice("Workspace already added", `${existing.name} is already in your workspace list.`, "info");
        return true;
      }
      const workspace = await client.createWorkspace({ name, path });
      setWorkspaceId(workspace.id);
      setCanvasId(undefined);
      setSurface("canvas");
      showNotice("Workspace added", `${workspace.name} now points to ${path}.`, "success");
      return true;
    } catch (error) {
      reportError(error, "Unable to create workspace");
      return false;
    }
  };

  const createWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    setWorkspaceCreateConfirmation({ name, parentPath: workspaceParentPath || settings.defaultProjectParent });
  };

  const confirmCreateWorkspace = async () => {
    const request = workspaceCreateConfirmation;
    if (!request) return;
    try {
      const path = await invoke<string>("create_project_directory", {
        parentPath: request.parentPath,
        name: request.name,
      });
      const created = await addWorkspace(request.name, path);
      if (created) {
        setWorkspaceCreateConfirmation(undefined);
        setWorkspaceDialogOpen(false);
        setNewWorkspaceName("");
        setWorkspaceParentPath("");
      } else {
        showNotice("Folder created", "The project folder exists, but Seekwd could not add it. Use Open Project to add it later.", "warning");
      }
    } catch (error) {
      reportError(error, "Unable to create project folder");
    }
  };

  const createCanvas = async () => {
    if (!activeWorkspace) return;
    try {
      const canvas = await client.createCanvas({ workspaceId: activeWorkspace.id, name: "Untitled Canvas" });
      setCanvasId(canvas.id);
      setOpenCanvasIds((current) => current.includes(canvas.id) ? current : [...current, canvas.id]);
      setExpandedWorkspaces((current) => ({ ...current, [activeWorkspace.id]: true }));
      setExpandedCanvases((current) => ({ ...current, [canvas.id]: true }));
      setSurface("canvas");
      showNotice("Canvas created", `${canvas.name} was added to ${activeWorkspace.name}.`, "success");
    } catch (error) {
      reportError(error, "Unable to create canvas");
    }
  };

  const startRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setRenameValue(target.name);
  };

  const confirmRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      if (renameTarget.kind === "workspace") await client.renameWorkspace(renameTarget.id, renameValue.trim());
      if (renameTarget.kind === "canvas") await client.renameCanvas(renameTarget.id, renameValue.trim());
      setRenameTarget(undefined);
      showNotice("Renamed", `${renameValue.trim()} is now saved.`, "success");
    } catch (error) {
      reportError(error, "Unable to rename item");
    }
  };

  const saveRevision = async () => {
    if (!activeCanvas) return;
    try {
      const revision = await client.saveRevision(activeCanvas.id, activeCanvas.draftRevision);
      showNotice("Revision saved", `Revision ${revision.revision} is ready to run.`, "success");
    } catch (error) {
      reportError(error, "Unable to save revision");
    }
  };

  const createProjectAnalysisWorkflow = async (request: string) => {
    if (!activeWorkspace) {
      showNotice("Choose a workspace", "Open the local project folder you want to analyze first.", "warning");
      return;
    }
    try {
      const canvas = activeCanvas && canvasNodes.length === 0
        ? activeCanvas
        : await client.createCanvas({ workspaceId: activeWorkspace.id, name: "Project Analysis" });
      const input = await client.createNode({ canvasId: canvas.id, name: "Analysis Request", kind: "input.text" });
      const analyze = await client.createNode({ canvasId: canvas.id, name: "Project Analyze", kind: "workspace.analyze" });
      const output = await client.createNode({ canvasId: canvas.id, name: "Analysis Report", kind: "output.text" });
      await client.updateNode({ nodeId: input.id, config: { inputValue: request, position: { x: 70, y: 170 } } });
      await client.updateNode({ nodeId: analyze.id, config: { maxEntries: 5000, maxDepth: 16, position: { x: 390, y: 170 } } });
      await client.updateNode({ nodeId: output.id, config: { position: { x: 730, y: 170 } } });

      const connect = async (
        source: WireNode,
        sourcePortName: string,
        target: WireNode,
        targetPortName: string,
        kind: PortKind,
      ) => {
        const sourcePort = source.ports.find((port) => port.name === sourcePortName && port.direction === "output");
        const targetPort = target.ports.find((port) => port.name === targetPortName && port.direction === "input");
        if (!sourcePort || !targetPort) throw new Error(`Missing ${sourcePortName} → ${targetPortName} ports`);
        await client.createEdge({
          canvasId: canvas.id,
          sourceNodeId: source.id,
          sourcePortId: sourcePort.id,
          targetNodeId: target.id,
          targetPortId: targetPort.id,
          kind,
        });
      };
      await connect(input, "Text", analyze, "Request", "data");
      await connect(input, "Complete", analyze, "Start", "flow");
      await connect(analyze, "Report", output, "Input", "data");
      await connect(analyze, "Complete", output, "Start", "flow");
      await client.setDefaultEntrypoint(canvas.id, input.id);
      const revision = await client.saveRevision(canvas.id);
      await client.startRun({
        canvasId: canvas.id,
        revision: revision.revision,
        entrypoint: "default",
        entrypointId: `${canvas.id}:default`,
        idempotencyKey: crypto.randomUUID(),
      });
      setWorkspaceId(activeWorkspace.id);
      setCanvasId(canvas.id);
      setOpenCanvasIds((current) => current.includes(canvas.id) ? current : [...current, canvas.id]);
      setSelectedNodeId(input.id);
      setRunPanelOpen(true);
      setSurface("canvas");
      showNotice("Project analysis started", `${canvas.name} is inspecting ${activeWorkspace.name} through the local restricted Host.`, "info");
    } catch (error) {
      reportError(error, "Unable to create the project analysis workflow");
    }
  };

  const runCanvas = async (composerValue?: string) => {
    if (!activeCanvas) return;
    const normalizedComposerValue = composerValue?.trim();
    const composerInputNode = normalizedComposerValue
      ? canvasNodes.find((node) => node.kind === "input.text")
      : undefined;
    if (normalizedComposerValue && !composerInputNode) {
      showNotice("Canvas input is not connected", "Add a Text Input node and connect it to a compatible data input before sending a value.", "warning");
      return;
    }
    try {
      if (normalizedComposerValue && composerInputNode) {
        await client.updateNode({ nodeId: composerInputNode.id, config: { inputValue: normalizedComposerValue } });
      }
      await flushAllNodeConfigs();
    } catch (error) {
      reportError(error, "Unable to save node inputs");
      return;
    }
    if (!activeCanvas.defaultEntrypointNodeId) {
      showNotice("Canvas is not directly runnable", "This canvas has no manual entrypoint. Select a node and choose Set as canvas entry node before running.", "warning");
      return;
    }
    const validationNodes = normalizedComposerValue && composerInputNode
      ? canvasNodes.map((node) => node.id === composerInputNode.id
        ? { ...node, config: { ...(node.config ?? {}), inputValue: normalizedComposerValue } }
        : node)
      : canvasNodes;
    const validation = validateCanvasGraphForUi(activeCanvas, validationNodes, canvasEdges);
    if (!validation.valid) {
      showNotice("Canvas is not ready", validation.message, "warning");
      return;
    }
    try {
      let revision = activeCanvas.revision;
      if (activeCanvas.draftDirty || Boolean(normalizedComposerValue)) {
        const saved = await client.saveRevision(
          activeCanvas.id,
          normalizedComposerValue ? undefined : activeCanvas.draftRevision,
        );
        revision = saved.revision;
      }
      await client.startRun({
        canvasId: activeCanvas.id,
        revision,
        entrypoint: "default",
        entrypointId: `${activeCanvas.id}:default`,
        idempotencyKey: crypto.randomUUID(),
      });
      setRunPanelOpen(true);
      setRunInputValue("");
      showNotice(activeCanvas.draftDirty ? "Graph saved and run started" : "Run started", `${activeCanvas.name} is running on the local Host.`, "info");
    } catch (error) {
      reportError(error, "Unable to start run");
    }
  };

  const submitComposerRequest = async (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    if (activeRun?.status === "waiting_input") {
      try {
        await client.submitRunInput({ runId: activeRun.id, value: normalizedValue });
        setRunInputValue("");
      } catch (error) {
        reportError(error, "Unable to submit node result");
      }
      return;
    }
    if (activeRun?.status === "running" || activeRun?.status === "queued") {
      showNotice("Run already active", "Wait for the current canvas run to finish before sending another value.", "warning");
      return;
    }
    const hasProjectAnalysisGraph = canvasNodes.some((node) => node.kind === "workspace.analyze")
      && canvasNodes.some((node) => node.kind === "input.text");
    if (isProjectAnalysisRequest(normalizedValue) && !hasProjectAnalysisGraph) {
      await createProjectAnalysisWorkflow(normalizedValue);
      return;
    }
    if (activeCanvas?.defaultEntrypointNodeId && canvasNodes.some((node) => node.kind === "input.text")) {
      await runCanvas(normalizedValue);
      return;
    }
    if (agentKeyConfigured && agentSettings.endpoint.trim() && agentSettings.model.trim()) {
      try {
        const response = await invoke<string>("run_agent_prompt", {
          endpoint: agentSettings.endpoint,
          model: agentSettings.model,
          prompt: normalizedValue,
          workspaceName: activeWorkspace?.name ?? "Workspace",
          environment: agentSettings.environment,
          instructions: agentSettings.instructions,
        });
        setAgentResponse(response);
        showNotice("Agent response received", `${agentSettings.name} returned a response.`, "success");
      } catch (error) {
        reportError(error, "Unable to run Agent request");
      }
      return;
    }
    await runCanvas(normalizedValue);
  };

  const submitRunInput = async () => {
    if (!activeRun || !runInputValue.trim()) return;
    try {
      await client.submitRunInput({ runId: activeRun.id, value: runInputValue.trim() });
      setRunInputValue("");
    } catch (error) {
      reportError(error, "Unable to submit node result");
    }
  };

  const addNode = async (name: string, position?: { x: number; y: number }) => {
    if (!activeCanvas) return;
    const kind = nodeKindForName(name);
    try {
      const node = await client.createNode({
        canvasId: activeCanvas.id,
        name,
        kind,
      });
      if (position) await client.updateNode({ nodeId: node.id, config: { position } });
      setSelectedNodeId(node.id);
      setNodeLibraryOpen(false);
      showNotice("Node added", `${name} was added to the canvas.`, "success");
    } catch (error) {
      reportError(error, "Unable to add node");
    }
  };

  const createPort = async () => {
    if (!portDialogNodeId || !portName.trim()) return;
    try {
      await client.createPort({
        nodeId: portDialogNodeId,
        name: portName.trim(),
        direction: portDirection,
        kind: portKind,
      });
      setPortDialogNodeId(undefined);
      setPortName("");
      showNotice("Port added", "The new port is saved to the local Host.", "success");
    } catch (error) {
      reportError(error, "Unable to add port");
    }
  };

  const setEntrypoint = async (nodeId: string) => {
    if (!activeCanvas) return;
    try {
      await client.setDefaultEntrypoint(activeCanvas.id, nodeId);
      showNotice("Canvas entry updated", "This node is now the default manual entrypoint.", "success");
    } catch (error) {
      reportError(error, "Unable to configure entrypoint");
    }
  };

  const updateNode = async (nodeId: string, input: Omit<Parameters<typeof client.updateNode>[0], "nodeId">) => {
    if (input.config) {
      updateNodeConfig(nodeId, input.config);
      return;
    }
    try {
      await client.updateNode({ ...input, nodeId });
    } catch (error) {
      reportError(error, "Unable to update node");
    }
  };

  const connectPort = async (
    nodeId: string,
    portId: string,
    direction: "input" | "output",
    kind: PortKind,
    dragSource?: { nodeId: string; portId: string; kind: PortKind; pointerId: number },
  ) => {
    if (direction === "output") {
      const isSamePort = connectionSource?.nodeId === nodeId && connectionSource.portId === portId;
      setConnectionSource(isSamePort ? null : { nodeId, portId, kind });
      showNotice(
        isSamePort ? "Connection cancelled" : "Output selected",
        isSamePort ? "The pending connection was cancelled." : "Now click a compatible input port on another node.",
        "info",
      );
      return;
    }
    if (!activeCanvas) {
      showNotice("No canvas selected", "Select a canvas before connecting ports.", "warning");
      return;
    }
    const source = dragSource ?? connectionSource;
    if (!source) {
      showNotice("Select an output first", "Start by clicking an output port on the source node.", "warning");
      return;
    }
    if (source.nodeId === nodeId) {
      showNotice("Connection not allowed", "A node cannot connect to itself.", "error");
      return;
    }
    if (source.kind !== kind) {
      showNotice("Port types do not match", `This output is ${source.kind}; the selected input expects ${kind}.`, "error");
      return;
    }
    try {
      await client.createEdge({
        canvasId: activeCanvas.id,
        sourceNodeId: source.nodeId,
        sourcePortId: source.portId,
        targetNodeId: nodeId,
        targetPortId: portId,
        kind,
      });
      setConnectionSource(null);
      showNotice("Connection created", "The node graph has been updated.", "success");
    } catch (error) {
      setConnectionSource(null);
      reportError(error, "Unable to create connection");
    }
  };

  const canvasState = toRuntimeState(activeCanvas?.status);
  const recentCanvases = [...snapshot.canvases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  return (
    <div className={`workbench-root ${settings.reduceMotion ? "reduce-motion" : ""}`} data-sk-theme="light">
      <WindowFrame
        className={`lab-window ${inspectorOpen && surface === "canvas" ? "" : "hide-inspector"} ${settings.compactSidebar ? "compact-sidebar" : ""}`}
        title={surface === "canvas" ? activeWorkspace?.name ?? "Seekwd Workbench" : surfaceTitle(surface)}
        subtitle={surface === "canvas" ? activeCanvas?.name ?? "Select a canvas" : activeWorkspace?.name ?? "Local host"}
        toolbar={
          <Toolbar>
            {surface === "canvas" ? (
              <Tooltip content="Toggle inspector">
                <IconButton label="Toggle inspector" active={inspectorOpen} onClick={() => setInspectorOpen((open) => !open)}>
                  <PanelRight />
                </IconButton>
              </Tooltip>
            ) : null}
          </Toolbar>
        }
        onClose={() => void nativeWindow.close()}
        onMinimize={() => void nativeWindow.minimize()}
        onZoom={() => void nativeWindow.toggleMaximize()}
        onTitlebarMouseDown={(event) => {
          if (event.button !== 0) return;
          const target = event.target as HTMLElement;
          if (target.closest("button, input, a, [role='button']")) return;
          if (event.detail === 2) void nativeWindow.toggleMaximize();
          else void nativeWindow.startDragging();
        }}
        sidebar={
          <WorkspaceNavigation
            surface={surface}
            activeWorkspace={activeWorkspace}
            activeCanvas={activeCanvas}
            snapshot={snapshot}
            workspacesOpen={workspacesOpen}
            recentOpen={recentOpen}
            expandedWorkspaces={expandedWorkspaces}
            expandedCanvases={expandedCanvases}
            onToggleWorkspaces={() => setWorkspacesOpen((open) => !open)}
            onToggleRecent={() => setRecentOpen((open) => !open)}
            onToggleWorkspace={(id) => setExpandedWorkspaces((items) => ({ ...items, [id]: !items[id] }))}
            onToggleCanvas={(id) => setExpandedCanvases((items) => ({ ...items, [id]: !items[id] }))}
            onNavigate={setSurface}
            onNewWorkspace={() => setWorkspaceDialogOpen(true)}
            onAddCanvas={createCanvas}
            onSelectWorkspace={selectWorkspace}
            onSelectCanvas={selectCanvas}
            onRename={startRename}
            onDeleteWorkspace={requestDeleteWorkspace}
            onDeleteCanvas={requestDeleteCanvas}
            onDeleteNode={requestDeleteNode}
            onSetEntrypoint={setEntrypoint}
            recentCanvases={recentCanvases}
            runs={snapshot.runs}
          />
        }
        inspector={surface === "canvas" && inspectorOpen ? selectedEdge
          ? <ConnectionInspector edge={selectedEdge} nodes={canvasNodes} onDelete={() => requestDeleteEdge(selectedEdge.id)} />
          : <NodeInspector node={selectedNode} canvas={activeCanvas} configDraft={nodeConfigDrafts[selectedNode?.id ?? ""]} onAddPort={() => selectedNode && setPortDialogNodeId(selectedNode.id)} onDeleteNode={selectedNode ? () => requestDeleteNode(selectedNode.id) : undefined} onFlushNodeConfig={(nodeId) => void flushNodeConfig(nodeId).catch((error) => reportError(error, "Unable to save node input"))} onUpdateNode={updateNode} />
          : undefined}
        bottomPanel={surface === "canvas" && runPanelOpen ? <RunPanel run={activeRun ?? latestRun} canvas={activeCanvas} nodes={canvasNodes} value={runInputValue} onValueChange={setRunInputValue} onSubmit={submitRunInput} /> : undefined}
      >
        {surface === "canvas" ? (
          <CanvasSurface
            workspaceName={activeWorkspace?.name ?? "Workspace"}
            workspaces={snapshot.workspaces}
            workspaceId={activeWorkspace?.id}
            scopeEnabled={composerScopeEnabled}
            agentConfigured={agentKeyConfigured && Boolean(agentSettings.endpoint.trim()) && Boolean(agentSettings.model.trim())}
            agentName={agentSettings.name}
            agentResponse={agentResponse}
            canvas={activeCanvas}
            openCanvases={snapshot.canvases.filter((item) => openCanvasIds.includes(item.id))}
            nodes={canvasNodes}
            edges={canvasEdges}
            selectedNodeId={selectedNode?.id}
            selectedEdgeId={selectedEdgeId}
            connectionSource={connectionSource}
            nodeLibraryOpen={nodeLibraryOpen}
            runHistoryOpen={runHistoryOpen}
            runs={canvasRuns}
            runPanelOpen={runPanelOpen}
            runState={canvasState}
            graphValidation={graphValidation}
            otherActiveRuns={otherActiveRuns}
            currentNodeId={activeRun?.currentNodeId ?? undefined}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            setSelectedEdgeId(undefined);
          }}
            onSelectEdge={(id) => {
              setSelectedEdgeId(id);
              setSelectedNodeId(undefined);
            }}
            onDeleteEdge={requestDeleteEdge}
            onPortConnect={(nodeId, portId, direction, kind, dragSource) => connectPort(nodeId, portId, direction, kind, dragSource)}
            onNodeMoved={(nodeId, position) => void updateNode(nodeId, { config: { position } })}
            onCancelConnection={() => {
              setConnectionSource(null);
              showNotice("Connection cancelled", "The pending connection was cancelled.", "info");
            }}
            onToggleNodeLibrary={() => setNodeLibraryOpen((open) => !open)}
            onCloseNodeLibrary={() => setNodeLibraryOpen(false)}
            onAddNode={addNode}
            onToggleRunHistory={() => setRunHistoryOpen((open) => !open)}
            onCloseRunHistory={() => setRunHistoryOpen(false)}
            onRun={runCanvas}
            onComposerWorkspaceChange={(workspace) => {
              selectWorkspace(workspace);
              setComposerScopeEnabled(true);
            }}
            onComposerScopeClear={() => setComposerScopeEnabled(false)}
            onComposerScopeEnable={() => setComposerScopeEnabled(true)}
            onComposerNewWorkspace={() => {
              setWorkspaceMode("create");
              setWorkspaceDialogOpen(true);
            }}
            onComposerSubmit={(value) => void submitComposerRequest(value)}
            onToggleRunPanel={() => setRunPanelOpen((open) => !open)}
            onAddCanvas={createCanvas}
            onSaveRevision={saveRevision}
            onSelectCanvas={selectCanvas}
            onCloseCanvas={closeCanvasTab}
          />
        ) : (
          <SurfacePage surface={surface} workspaceName={activeWorkspace?.name ?? "Workspace"} settings={settings} onSettingsChange={(key, value) => setSettings((current) => ({ ...current, [key]: value }))} agentSettings={agentSettings} agentKeyConfigured={agentKeyConfigured} onAgentSettingsChange={(key, value) => setAgentSettings((current) => ({ ...current, [key]: value }))} onAgentKeyConfigured={setAgentKeyConfigured} onNotice={showNotice} />
        )}
      </WindowFrame>

      {notices.length ? (
        <div className="notification-stack">
          {notices.map((item) => <Notification
            key={item.id}
            title={item.title}
            icon={noticeIcon(item.severity)}
            time="now"
            duration={item.severity === "error" ? 0 : item.severity === "warning" ? 8000 : 5000}
            onDismiss={() => setNotices((current) => current.filter((notice) => notice.id !== item.id))}
          >
            {item.message}
          </Notification>)}
        </div>
      ) : null}

      <Dialog
        open={workspaceDialogOpen}
        title="Project"
        description="Create a new project or open an existing project folder. Seekwd will not delete project files during uninstall."
        onClose={() => setWorkspaceDialogOpen(false)}
        footer={
          <>
            <Button onClick={() => setWorkspaceDialogOpen(false)}>Cancel</Button>
            {workspaceMode === "create"
              ? <Button variant="primary" leadingIcon={<FolderPlus />} onClick={() => void createWorkspace()} disabled={!newWorkspaceName.trim()}>Create project</Button>
              : null}
          </>
        }
        className="workspace-dialog"
      >
        <SegmentedControl
          label="Project action"
          value={workspaceMode}
          onChange={setWorkspaceMode}
          options={[
            { value: "create", label: "Create project", icon: <FolderPlus /> },
            { value: "open", label: "Open project", icon: <FolderOpen /> },
          ]}
        />
        {workspaceMode === "create" ? (
          <div className="workspace-dialog-form">
            <TextField label="Project name" autoFocus value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} placeholder="e.g. huizhou-backend" />
            <button type="button" className="workspace-folder-picker" onClick={() => void chooseWorkspaceFolder()}>
              <FolderOpen aria-hidden="true" />
              <span><strong>{workspaceParentPath || "Default: local Seekwd Projects folder"}</strong><small>Optional: choose a different parent folder</small></span>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button type="button" className="workspace-folder-picker workspace-folder-picker--large" onClick={() => void chooseWorkspaceFolder()}>
            <FolderOpen aria-hidden="true" />
            <span><strong>Choose an existing project folder</strong><small>The folder will be added to your workspace list</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </Dialog>

      <Dialog
        open={Boolean(pendingWorkspace)}
        title="Trust this folder?"
        description={pendingWorkspace?.path}
        onClose={() => setPendingWorkspace(undefined)}
        footer={
          <>
            <Button onClick={() => setPendingWorkspace(undefined)}>Cancel</Button>
            <Button variant="primary" onClick={() => {
              const item = pendingWorkspace;
              setPendingWorkspace(undefined);
              if (item) void addWorkspace(item.name, item.path);
            }}>Trust folder</Button>
          </>
        }
      >
        <p className="workspace-trust-copy">Seekwd can read and modify files in this folder. Continue only if you trust its contents.</p>
      </Dialog>

      <Dialog
        open={Boolean(workspaceCreateConfirmation)}
        title="Create this project?"
        description={workspaceCreateConfirmation ? `A new folder named “${workspaceCreateConfirmation.name}” will be created.` : undefined}
        onClose={() => setWorkspaceCreateConfirmation(undefined)}
        footer={
          <>
            <Button onClick={() => setWorkspaceCreateConfirmation(undefined)}>Cancel</Button>
            <Button variant="primary" onClick={() => void confirmCreateWorkspace()}>Create project</Button>
          </>
        }
        className="workspace-dialog"
      >
        <p className="workspace-trust-copy">Location: {workspaceCreateConfirmation?.parentPath || "Default: user home folder / SeekwdProjects"}</p>
      </Dialog>

      <Dialog
        open={Boolean(renameTarget)}
        title={`Rename ${renameTarget?.kind ?? "item"}`}
        onClose={() => setRenameTarget(undefined)}
        footer={
          <>
            <Button onClick={() => setRenameTarget(undefined)}>Cancel</Button>
            <Button variant="primary" onClick={() => void confirmRename()} disabled={!renameValue.trim()}>Save</Button>
          </>
        }
      >
        <TextField label="Name" autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.kind ?? "item"}?`}
        description={deleteTarget?.description}
        onClose={() => setDeleteTarget(undefined)}
        footer={
          <>
            <Button onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
            <Button variant="danger" leadingIcon={<Trash2 />} onClick={() => void confirmDelete()}>Delete</Button>
          </>
        }
      >
        <div className="delete-warning"><TriangleAlert /><span><strong>{deleteTarget?.name}</strong><small>This action cannot be undone.</small></span></div>
      </Dialog>

      <Dialog
        open={Boolean(portDialogNodeId)}
        title="Add port"
        description="Ports are part of the node contract. Connections can only be made between compatible output and input ports."
        onClose={() => setPortDialogNodeId(undefined)}
        footer={
          <>
            <Button onClick={() => setPortDialogNodeId(undefined)}>Cancel</Button>
            <Button variant="primary" onClick={() => void createPort()} disabled={!portName.trim()}>Add port</Button>
          </>
        }
      >
        <div className="port-form">
          <TextField label="Port name" autoFocus value={portName} onChange={(event) => setPortName(event.target.value)} placeholder="Input data" />
          <label className="form-select"><span>Direction</span><select value={portDirection} onChange={(event) => setPortDirection(event.target.value as "input" | "output")}><option value="input">Input</option><option value="output">Output</option></select></label>
          <label className="form-select"><span>Kind</span><select value={portKind} onChange={(event) => setPortKind(event.target.value as PortKind)}><option value="data">Data</option><option value="flow">Flow</option><option value="event">Event</option><option value="resource">Resource</option></select></label>
        </div>
      </Dialog>
    </div>
  );
}

interface WorkspaceNavigationProps {
  surface: Surface;
  activeWorkspace?: Workspace;
  activeCanvas?: Canvas;
  snapshot: HostSnapshot;
  workspacesOpen: boolean;
  recentOpen: boolean;
  expandedWorkspaces: Record<string, boolean>;
  expandedCanvases: Record<string, boolean>;
  onToggleWorkspaces: () => void;
  onToggleRecent: () => void;
  onToggleWorkspace: (id: string) => void;
  onToggleCanvas: (id: string) => void;
  onNavigate: (surface: Surface) => void;
  onNewWorkspace: () => void;
  onAddCanvas: () => void;
  onSelectWorkspace: (workspace: Workspace) => void;
  onSelectCanvas: (canvas: Canvas) => void;
  onRename: (target: RenameTarget) => void;
  onDeleteWorkspace: (workspace: Workspace) => void;
  onDeleteCanvas: (canvas: Canvas) => void;
  onDeleteNode: (nodeId: string) => void;
  onSetEntrypoint: (nodeId: string) => void;
  recentCanvases: Canvas[];
  runs: Run[];
}

function WorkspaceNavigation(props: WorkspaceNavigationProps) {
  const {
    surface, activeWorkspace, activeCanvas, snapshot, workspacesOpen, recentOpen, expandedWorkspaces, expandedCanvases,
    onToggleWorkspaces, onToggleRecent, onToggleWorkspace, onToggleCanvas, onNavigate, onNewWorkspace, onAddCanvas,
    onSelectWorkspace, onSelectCanvas, onRename, onDeleteWorkspace, onDeleteCanvas, onDeleteNode, onSetEntrypoint, recentCanvases, runs,
  } = props;
  return (
    <div className="sidebar-shell">
      <nav className="sidebar-global" aria-label="Global actions">
        <SidebarItem icon={<FolderPlus />} onClick={onNewWorkspace}>New Workspace</SidebarItem>
        <SidebarItem icon={<CalendarClock />} active={surface === "automations"} onClick={() => onNavigate("automations")}>Automations</SidebarItem>
        <SidebarItem icon={<Blocks />} active={surface === "extensions"} onClick={() => onNavigate("extensions")}>Extensions</SidebarItem>
      </nav>
      <div className="sidebar-scroll">
        <SidebarDisclosure label="Workspaces" open={workspacesOpen} onToggle={onToggleWorkspaces}>
          {snapshot.workspaces.map((workspace) => {
            const canvases = snapshot.canvases.filter((canvas) => canvas.workspaceId === workspace.id);
            return (
              <WorkspaceRow
                key={workspace.id}
                workspace={workspace}
                canvases={canvases}
                current={workspace.id === activeWorkspace?.id}
                open={expandedWorkspaces[workspace.id] ?? workspace.id === activeWorkspace?.id}
                activeCanvasId={activeCanvas?.id}
                expandedCanvases={expandedCanvases}
                nodes={snapshot.nodes}
                onToggle={() => onToggleWorkspace(workspace.id)}
                onToggleCanvas={onToggleCanvas}
                onSelectWorkspace={() => onSelectWorkspace(workspace)}
                onSelectCanvas={onSelectCanvas}
                onAddCanvas={workspace.id === activeWorkspace?.id ? onAddCanvas : undefined}
                onRename={() => onRename({ kind: "workspace", id: workspace.id, name: workspace.name })}
                onDelete={() => onDeleteWorkspace(workspace)}
                onRenameCanvas={(canvas) => onRename({ kind: "canvas", id: canvas.id, name: canvas.name })}
                onDeleteCanvas={onDeleteCanvas}
                onDeleteNode={onDeleteNode}
                onSetEntrypoint={onSetEntrypoint}
                runs={runs}
              />
            );
          })}
          {!snapshot.workspaces.length ? <EmptySidebar label="No workspaces yet" action="Create Workspace" onClick={onNewWorkspace} /> : null}
        </SidebarDisclosure>
        <SidebarDisclosure label="Recent" open={recentOpen} onToggle={onToggleRecent}>
          {recentCanvases.map((canvas) => (
            <SidebarItem key={canvas.id} icon={<History />} active={canvas.id === activeCanvas?.id} trailing={<RuntimeIcon state={toRuntimeState(canvas.status)} />} onClick={() => onSelectCanvas(canvas)}>
              {canvas.name}
            </SidebarItem>
          ))}
          {!recentCanvases.length ? <EmptySidebar label="No recent canvases" /> : null}
        </SidebarDisclosure>
      </div>
      <div className="sidebar-footer">
        <SidebarItem icon={<Folder />} active={surface === "files"} onClick={() => onNavigate("files")}>Files</SidebarItem>
        <SidebarItem icon={<Settings />} active={surface === "settings"} onClick={() => onNavigate("settings")}>Settings</SidebarItem>
        <SidebarItem icon={<ShieldCheck />} active={surface === "environments"} onClick={() => onNavigate("environments")}>Environments</SidebarItem>
        <SidebarItem icon={<Bot />} active={surface === "agents"} onClick={() => onNavigate("agents")}>Agents</SidebarItem>
      </div>
    </div>
  );
}

function SidebarDisclosure({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className={`sidebar-disclosure ${open ? "is-open" : ""}`}>
      <header>
        <strong>{label}</strong>
        <button type="button" aria-label={`${open ? "Collapse" : "Expand"} ${label}`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button>
      </header>
      {open ? <div>{children}</div> : null}
    </section>
  );
}

function WorkspaceRow({
  workspace, canvases, current, open, activeCanvasId, expandedCanvases, nodes, onToggle, onToggleCanvas, onSelectWorkspace,
  onSelectCanvas, onAddCanvas, onRename, onDelete, onRenameCanvas, onDeleteCanvas, onDeleteNode, onSetEntrypoint, runs,
}: {
  workspace: Workspace;
  canvases: Canvas[];
  current: boolean;
  open: boolean;
  activeCanvasId?: string;
  expandedCanvases: Record<string, boolean>;
  nodes: WireNode[];
  onToggle: () => void;
  onToggleCanvas: (id: string) => void;
  onSelectWorkspace: () => void;
  onSelectCanvas: (canvas: Canvas) => void;
  onAddCanvas?: () => void;
  onRename: () => void;
  onDelete: () => void;
  onRenameCanvas: (canvas: Canvas) => void;
  onDeleteCanvas: (canvas: Canvas) => void;
  onDeleteNode: (nodeId: string) => void;
  onSetEntrypoint: (nodeId: string) => void;
  runs: Run[];
}) {
  const state = aggregateState(canvases.map((canvas) => toRuntimeState(canvas.status)));
  return (
    <section className={`workspace-row ${open ? "is-open" : ""} ${current ? "is-current" : ""}`}>
      <div className="workspace-row__header">
        <button type="button" className="workspace-row__chevron" aria-label={`${open ? "Collapse" : "Expand"} ${workspace.name}`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button>
        <FolderOpen className="workspace-row__icon" aria-hidden="true" />
        <button type="button" className="workspace-row__name workspace-row__name-button" onClick={onSelectWorkspace}>{workspace.name}</button>
        <RuntimeIcon state={state} />
        <span className="workspace-row__actions">
          {onAddCanvas ? <Tooltip content="New Canvas"><IconButton label="New Canvas" size="small" onClick={onAddCanvas}><Plus /></IconButton></Tooltip> : null}
          <Menu label={`${workspace.name} actions`} icon={<MoreHorizontal />} iconOnly items={[{ label: "Rename", icon: <Pencil />, onSelect: onRename }, { label: "Delete workspace", icon: <Trash2 />, onSelect: onDelete }]} />
        </span>
      </div>
      {open ? (
        <div className="workspace-row__children">
          {canvases.map((canvas) => (
            <CanvasRow
              key={canvas.id}
              canvas={canvas}
              active={canvas.id === activeCanvasId}
              open={expandedCanvases[canvas.id] ?? canvas.id === activeCanvasId}
              nodes={nodes.filter((node) => node.canvasId === canvas.id).sort((left, right) => Number(right.id === canvas.defaultEntrypointNodeId) - Number(left.id === canvas.defaultEntrypointNodeId))}
              onToggle={() => onToggleCanvas(canvas.id)}
              onSelect={() => onSelectCanvas(canvas)}
              onRename={() => onRenameCanvas(canvas)}
              onDelete={() => onDeleteCanvas(canvas)}
              onDeleteNode={onDeleteNode}
              onSetEntrypoint={onSetEntrypoint}
              run={runs.find((run) => run.canvasId === canvas.id && ["running", "queued", "waiting_input"].includes(run.status))}
            />
          ))}
          {onAddCanvas ? <button type="button" className="workspace-add-canvas" onClick={onAddCanvas}><Plus /><span>New Canvas</span></button> : null}
        </div>
      ) : null}
    </section>
  );
}

function CanvasRow({
  canvas, active, open, nodes, onToggle, onSelect, onRename, onDelete, onDeleteNode, onSetEntrypoint, run,
}: {
  canvas: Canvas;
  active: boolean;
  open: boolean;
  nodes: WireNode[];
  onToggle: () => void;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDeleteNode: (nodeId: string) => void;
  onSetEntrypoint: (nodeId: string) => void;
  run?: Run;
}) {
  const currentNode = run?.currentNodeId ? nodes.find((node) => node.id === run.currentNodeId) : undefined;
  return (
    <div className={`canvas-row ${active ? "is-active" : ""} ${open ? "is-open" : ""}`}>
      <div className="canvas-row__header">
        <button type="button" className="canvas-row__chevron" aria-label={`${open ? "Collapse" : "Expand"} ${canvas.name} nodes`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button>
        <button type="button" className="canvas-row__select" onClick={onSelect}><PanelsTopLeft /><span>{canvas.name}</span></button>
        <span className="canvas-row__runtime">
          {run ? <small title={`Current node: ${currentNode?.name ?? "Preparing"}`}>{currentNode?.name ?? "Running"}</small> : null}
          <RuntimeIcon state={toRuntimeState(canvas.status)} />
        </span>
        <span className="canvas-row__actions"><Menu label={`${canvas.name} actions`} icon={<MoreHorizontal />} iconOnly items={[{ label: "Rename", icon: <Pencil />, onSelect: onRename }, { label: "Delete canvas", icon: <Trash2 />, onSelect: onDelete }]} /></span>
      </div>
      {open ? (
        <div className="node-preview-list">
          {nodes.map((node) => (
            <div className="node-preview-row" key={node.id}>
              <Bot />
              <span title={node.name}>{node.name}</span>
              {canvas.defaultEntrypointNodeId === node.id ? <span className="node-preview-row__primary" title="Default manual entrypoint"><CirclePlay /><small>Default entry</small></span> : <Tooltip content={`Set ${node.name} as the default manual entrypoint`}><IconButton label={`Set ${node.name} as the default manual entrypoint`} size="small" className="node-preview-row__set-primary" onClick={() => onSetEntrypoint(node.id)}><CirclePlay /></IconButton></Tooltip>}
              <Menu label={`${node.name} actions`} icon={<MoreHorizontal />} iconOnly items={[{ label: "Canvas entry", icon: <CirclePlay />, disabled: true, onSelect: () => undefined }, { label: "Delete node", icon: <Trash2 />, onSelect: () => onDeleteNode(node.id) }]} />
            </div>
          ))}
          {!nodes.length ? <span className="node-preview-empty">No nodes</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function EmptySidebar({ label, action, onClick }: { label: string; action?: string; onClick?: () => void }) {
  return <div className="sidebar-empty">{label}{action ? <button type="button" onClick={onClick}>{action}</button> : null}</div>;
}

function RuntimeIcon({ state }: { state: RuntimeState }) {
  const Icon = state === "running" ? LoaderCircle : state === "success" ? CheckCircle2 : state === "waiting" ? Clock3 : state === "error" ? CircleAlert : CirclePlay;
  return <Icon className={`canvas-runtime-icon is-${state}`} aria-label={stateLabel(state)} />;
}

function CanvasSurface({
  workspaceName, workspaces, workspaceId, scopeEnabled, agentConfigured, agentName, agentResponse, canvas, openCanvases, nodes, edges, selectedNodeId, selectedEdgeId, connectionSource, nodeLibraryOpen, runHistoryOpen, runs, runPanelOpen, runState, currentNodeId,
  graphValidation, otherActiveRuns, onSelectNode, onSelectEdge, onDeleteEdge, onPortConnect, onNodeMoved, onToggleNodeLibrary, onCloseNodeLibrary, onAddNode, onToggleRunHistory, onCloseRunHistory, onRun,
  onToggleRunPanel, onAddCanvas, onSaveRevision, onCancelConnection, onSelectCanvas, onCloseCanvas, onComposerWorkspaceChange, onComposerScopeClear, onComposerScopeEnable, onComposerNewWorkspace, onComposerSubmit,
}: {
  workspaceName: string;
  workspaces: Workspace[];
  workspaceId?: string;
  scopeEnabled: boolean;
  agentConfigured: boolean;
  agentName: string;
  agentResponse: string;
  canvas?: Canvas;
  openCanvases: Canvas[];
  nodes: WireNode[];
  edges: CanvasEdge[];
  selectedNodeId?: string;
  selectedEdgeId?: string;
  connectionSource: { nodeId: string; portId: string; kind: PortKind } | null;
  nodeLibraryOpen: boolean;
  runHistoryOpen: boolean;
  runs: Run[];
  runPanelOpen: boolean;
  runState: RuntimeState;
  currentNodeId?: string;
  graphValidation: GraphValidation;
  otherActiveRuns: string[];
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onPortConnect: (nodeId: string, portId: string, direction: "input" | "output", kind: PortKind, dragSource?: { nodeId: string; portId: string; kind: PortKind; pointerId: number }) => void;
  onNodeMoved: (nodeId: string, position: { x: number; y: number }) => void;
  onToggleNodeLibrary: () => void;
  onCloseNodeLibrary: () => void;
  onAddNode: (name: string, position?: { x: number; y: number }) => void;
  onToggleRunHistory: () => void;
  onCloseRunHistory: () => void;
  onRun: () => void;
  onToggleRunPanel: () => void;
  onAddCanvas: () => void;
  onSaveRevision: () => void;
  onCancelConnection: () => void;
  onSelectCanvas: (canvas: Canvas) => void;
  onCloseCanvas: (canvasId: string) => void;
  onComposerWorkspaceChange: (workspace: Workspace) => void;
  onComposerScopeClear: () => void;
  onComposerScopeEnable: () => void;
  onComposerNewWorkspace: () => void;
  onComposerSubmit: (value: string) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [edgePaths, setEdgePaths] = useState<Array<{ id: string; d: string }>>([]);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [dragConnection, setDragConnection] = useState<null | { nodeId: string; portId: string; kind: PortKind; x: number; y: number; pointerId: number }>(null);
  const [dragNode, setDragNode] = useState<null | { nodeId: string; pointerId: number; offsetX: number; offsetY: number }>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const suppressNextPortClick = useRef(false);
  useEffect(() => {
    setNodePositions({});
    nodePositionsRef.current = {};
    setDragNode(null);
    setDragConnection(null);
  }, [canvas?.id]);
  useEffect(() => {
    if (canvas?.id) tabRefs.current[canvas.id]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [canvas?.id, openCanvases.length]);
  const positions = nodes.map((node, index) => {
    const stored = nodePositions[node.id] ?? node.config?.position;
    return stored && typeof stored === "object" && typeof stored.x === "number" && typeof stored.y === "number"
      ? { x: stored.x, y: stored.y, cssLeft: `${stored.x}px`, cssTop: `${stored.y}px` }
      : nodePosition(index);
  });
  const canvasPoint = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : { x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragConnection) {
      const point = canvasPoint(event);
      setDragConnection({ ...dragConnection, x: point.x, y: point.y });
    }
    if (dragNode) {
      const point = canvasPoint(event);
      const x = Math.max(8, point.x - dragNode.offsetX);
      const y = Math.max(70, point.y - dragNode.offsetY);
      const next = { x, y };
      nodePositionsRef.current = { ...nodePositionsRef.current, [dragNode.nodeId]: next };
      setNodePositions((current) => ({ ...current, [dragNode.nodeId]: next }));
    }
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragConnection && event.pointerId === dragConnection.pointerId) {
      setDragConnection(null);
    }
    if (dragNode && event.pointerId === dragNode.pointerId) {
      setDragNode(null);
      const position = nodePositionsRef.current[dragNode.nodeId] ?? nodePositions[dragNode.nodeId];
      if (position) {
        onNodeMoved(dragNode.nodeId, position);
        const element = canvasRef.current?.querySelector<HTMLElement>(`[data-node-id="${dragNode.nodeId}"]`);
        if (element) {
          element.style.left = `${position.x}px`;
          element.style.top = `${position.y}px`;
        }
      }
    }
  };
  useLayoutEffect(() => {
    const surface = canvasRef.current;
    if (!surface) return;
    const updatePaths = () => {
      const surfaceRect = surface.getBoundingClientRect();
      const portElements = Array.from(surface.querySelectorAll<HTMLElement>("[data-port-key]"));
      const paths = edges.flatMap((edge) => {
        const source = portElements.find((element) => element.dataset.portKey === `${edge.sourceNodeId}:${edge.sourcePortId}`);
        const target = portElements.find((element) => element.dataset.portKey === `${edge.targetNodeId}:${edge.targetPortId}`);
        if (!source || !target) return [];
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const sx = sourceRect.left - surfaceRect.left + sourceRect.width / 2;
        const sy = sourceRect.top - surfaceRect.top + sourceRect.height / 2;
        const tx = targetRect.left - surfaceRect.left + targetRect.width / 2;
        const ty = targetRect.top - surfaceRect.top + targetRect.height / 2;
        const bend = Math.max(48, Math.abs(tx - sx) * 0.45);
        return [{ id: edge.id, d: `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}` }];
      });
      setEdgePaths(paths);
    };
    updatePaths();
    const observer = new ResizeObserver(updatePaths);
    observer.observe(surface);
    surface.querySelectorAll<HTMLElement>(".sk-node").forEach((node) => observer.observe(node));
    window.addEventListener("resize", updatePaths);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePaths);
    };
  }, [edges, nodes, nodePositions, zoom]);
  if (!canvas) {
    return <div className="surface-empty"><Folder /><strong>No canvas selected</strong><p>Create a canvas from the left navigation.</p></div>;
  }
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const selectedEdgeSource = selectedEdge ? nodes.find((node) => node.id === selectedEdge.sourceNodeId) : undefined;
  const selectedEdgeTarget = selectedEdge ? nodes.find((node) => node.id === selectedEdge.targetNodeId) : undefined;
  const selectedEdgeSourcePort = selectedEdgeSource?.ports.find((port) => port.id === selectedEdge?.sourcePortId);
  const selectedEdgeTargetPort = selectedEdgeTarget?.ports.find((port) => port.id === selectedEdge?.targetPortId);
  const onDropNode = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const name = event.dataTransfer.getData("application/x-seekwd-node") || event.dataTransfer.getData("text/plain");
    if (!name) return;
    const point = canvasPoint(event);
    onAddNode(name, { x: Math.max(8, point.x - 120), y: Math.max(70, point.y - 40) });
  };
  return (
    <div className="canvas-preview" ref={canvasRef} onDragOver={(event) => event.preventDefault()} onDrop={onDropNode} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="canvas-tabbar">
        {openCanvases.map((tab) => <div className={`canvas-tab ${tab.id === canvas.id ? "is-active" : ""}`} key={tab.id} ref={(element) => { tabRefs.current[tab.id] = element; }} onMouseDown={(event) => { if (event.button === 1) { event.preventDefault(); onCloseCanvas(tab.id); } }}>
          <button type="button" className="canvas-tab__select" onClick={() => onSelectCanvas(tab)}><PanelsTopLeft /><span>{tab.name}</span>{tab.draftDirty ? <i title="Unsaved changes" /> : null}</button>
          <button type="button" className="canvas-tab__close" aria-label={`Close ${tab.name}`} onClick={() => onCloseCanvas(tab.id)}><X /></button>
        </div>)}
        <button type="button" aria-label="New canvas tab" title="New canvas tab" onClick={onAddCanvas}><Plus /></button>
      </div>
      <div className="canvas-breadcrumb">
        <span>{workspaceName}</span><ChevronRight /><strong>{canvas.name}</strong>
        {connectionSource || dragConnection ? <span className="canvas-connection-status"><span className="canvas-connection-status__dot" />Select a compatible input port <button type="button" onClick={onCancelConnection}>Cancel</button></span> : null}
        {selectedEdge ? <span className="canvas-connection-status is-selected"><span className="canvas-connection-status__dot" />Selected: {selectedEdgeSourcePort?.name ?? "Output"} → {selectedEdgeTargetPort?.name ?? "Input"} <button type="button" onClick={() => onDeleteEdge(selectedEdge.id)}>Delete</button></span> : null}
        {otherActiveRuns.length ? <span className="canvas-other-runs" title={otherActiveRuns.join("\n")}><LoaderCircle />{otherActiveRuns.length} other canvas{otherActiveRuns.length === 1 ? "" : "es"} running</span> : null}
      </div>
      <div className="canvas-actions" aria-label="Canvas actions">
        <Tooltip content="Add node" side="top"><IconButton label="Add node" active={nodeLibraryOpen} onClick={onToggleNodeLibrary}><Blocks /></IconButton></Tooltip>
        <Tooltip content={canvas.draftDirty ? "Save revision before running" : "Save revision"} side="top"><IconButton label="Save revision" active={canvas.draftDirty} onClick={onSaveRevision}><ArrowUpFromLine /></IconButton></Tooltip>
        <Tooltip content={!graphValidation.valid ? graphValidation.message : canvas.draftDirty ? "Save the current graph, create a revision, then run it" : runState === "running" ? "A run is already active" : runState === "waiting" ? "This run is waiting for input" : "Run this saved revision"} side="top"><span><Button variant="primary" size="small" leadingIcon={<Play />} onClick={onRun} disabled={!graphValidation.valid || runState === "running" || runState === "waiting"}>{runState === "running" ? "Running" : runState === "waiting" ? "Waiting" : canvas.draftDirty ? "Save & Run" : "Run"}</Button></span></Tooltip>
        {!graphValidation.valid ? <span className="canvas-run-validation" role="status"><CircleAlert />{graphValidation.message}</span> : null}
        <Tooltip content="Run history" side="top"><IconButton label="Run history" active={runHistoryOpen} onClick={onToggleRunHistory}><History /></IconButton></Tooltip>
        <Tooltip content="Toggle run output" side="top"><IconButton label="Toggle run output" active={runPanelOpen} onClick={onToggleRunPanel}><PanelBottom /></IconButton></Tooltip>
      </div>
      <svg className="canvas-edges" aria-label="Canvas connections">
        {edgePaths.map((path) => <g key={path.id} className={selectedEdgeId === path.id ? "is-selected" : ""} onClick={(event) => { event.stopPropagation(); onSelectEdge(path.id); }}>
          <path className="edge-hit" d={path.d} pathLength={1} />
          <path className="edge-visible" d={path.d} pathLength={1} />
        </g>)}
        {dragConnection ? (() => {
          const source = Array.from(canvasRef.current?.querySelectorAll<HTMLElement>("[data-port-key]") ?? [])
            .find((element) => element.dataset.portKey === `${dragConnection.nodeId}:${dragConnection.portId}`);
          const surfaceRect = canvasRef.current?.getBoundingClientRect();
          if (!source || !surfaceRect) return null;
          const sourceRect = source.getBoundingClientRect();
          const sx = sourceRect.left - surfaceRect.left + sourceRect.width / 2;
          const sy = sourceRect.top - surfaceRect.top + sourceRect.height / 2;
          const bend = Math.max(48, Math.abs(dragConnection.x - sx) * 0.45);
          return <path className="is-draft" d={`M ${sx} ${sy} C ${sx + bend} ${sy}, ${dragConnection.x - bend} ${dragConnection.y}, ${dragConnection.x} ${dragConnection.y}`} />;
        })() : null}
      </svg>
      {nodes.map((node, index) => (
        <WorkbenchNode
          key={node.id}
          node={node}
          index={index}
          position={positions[index]}
          selected={node.id === selectedNodeId}
          primary={node.id === canvas.defaultEntrypointNodeId}
          state={node.id === currentNodeId ? (runState === "waiting" ? "waiting" : "running") : node.id === canvas.defaultEntrypointNodeId ? (runState === "success" ? "success" : "idle") : "idle"}
          incoming={edges.filter((edge) => edge.targetNodeId === node.id)}
          outgoing={edges.filter((edge) => edge.sourceNodeId === node.id)}
          connectionSource={connectionSource ?? (dragConnection ? { nodeId: dragConnection.nodeId, portId: dragConnection.portId, kind: dragConnection.kind } : null)}
          onSelect={() => onSelectNode(node.id)}
          onPortConnect={(nodeId, portId, direction, kind, dragSource) => {
            if (suppressNextPortClick.current) {
              suppressNextPortClick.current = false;
              return;
            }
            onPortConnect(nodeId, portId, direction, kind, dragSource);
          }}
          onPortPointerDown={(event, portId, direction, kind) => {
            if (direction !== "output") return;
            const point = canvasPoint(event);
            setDragConnection({ nodeId: node.id, portId, kind, x: point.x, y: point.y, pointerId: event.pointerId });
          }}
          onPortPointerUp={(event, portId, direction, kind) => {
            if (!dragConnection || direction !== "input") return;
            if (event.pointerId !== dragConnection.pointerId) return;
            suppressNextPortClick.current = true;
            onPortConnect(node.id, portId, direction, kind, dragConnection);
            setDragConnection(null);
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }}
          onNodePointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            const nodeRect = (event.currentTarget.closest("[data-node-id]") as HTMLElement | null)?.getBoundingClientRect();
            const surfaceRect = canvasRef.current?.getBoundingClientRect();
            if (!nodeRect || !surfaceRect) return;
            setDragNode({ nodeId: node.id, pointerId: event.pointerId, offsetX: event.clientX - nodeRect.left, offsetY: event.clientY - nodeRect.top });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        />
      ))}
      {nodes.length > 0 && edges.length === 0 ? <div className="canvas-guide" role="note"><strong>Build the first path</strong><span>For Hello World, add <b>Text Input</b> and <b>Text Output</b>, make Text Input the entrypoint, then connect <b>Text Input.Text → Text Output.Input</b>. Data connections activate their downstream node; use Flow only when execution order has no data dependency.</span></div> : null}
      {!nodes.length ? <div className="canvas-empty-hint">Add a node to start building this canvas.</div> : null}
      {nodeLibraryOpen ? <NodeLibrary onAdd={onAddNode} onClose={onCloseNodeLibrary} /> : null}
      {runHistoryOpen ? <RunHistoryPanel canvas={canvas} runs={runs} onClose={onCloseRunHistory} /> : null}
      <AgentComposer
        workspaceName={workspaceName}
        workspaces={workspaces}
        workspaceId={workspaceId}
        scopeEnabled={scopeEnabled}
        agentConfigured={agentConfigured}
        agentName={agentName}
        agentResponse={agentResponse}
        onWorkspaceChange={onComposerWorkspaceChange}
        onScopeClear={onComposerScopeClear}
        onScopeEnable={onComposerScopeEnable}
        onNewWorkspace={onComposerNewWorkspace}
        onSubmit={onComposerSubmit}
      />
      <div className="canvas-zoom"><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 10))}>−</button><span>{zoom}%</span><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(200, value + 10))}><Plus /></button></div>
    </div>
  );
}

function WorkbenchNode({
  node, position, selected, primary, state, incoming, outgoing, connectionSource, onSelect, onPortConnect,
  onPortPointerDown, onPortPointerUp, onNodePointerDown,
}: {
  node: WireNode;
  index: number;
  position: { x: number; y: number; cssLeft: string; cssTop: string };
  selected: boolean;
  primary: boolean;
  state: "idle" | "running" | "waiting" | "success" | "error";
  incoming: CanvasEdge[];
  outgoing: CanvasEdge[];
  connectionSource: { nodeId: string; portId: string; kind: PortKind } | null;
  onSelect: () => void;
  onPortConnect: (nodeId: string, portId: string, direction: "input" | "output", kind: PortKind, dragSource?: { nodeId: string; portId: string; kind: PortKind; pointerId: number }) => void;
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, portId: string, direction: "input" | "output", kind: PortKind) => void;
  onPortPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>, portId: string, direction: "input" | "output", kind: PortKind) => void;
  onNodePointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const definition = nodeDefinition(node);
  return (
    <CanvasNode
      nodeId={node.id}
      className="node-added"
      style={{ left: position.cssLeft, top: position.cssTop }}
      title={node.name}
      typeLabel={definition.typeLabel}
      description={definition.description}
      icon={definition.icon}
      state={state}
      selected={selected}
      primary={primary}
      inputs={definition.inputs.map((port) => ({ ...port, connectionCount: incoming.filter((edge) => edge.targetPortId === port.id).length }))}
      outputs={definition.outputs.map((port) => ({ ...port, connectionCount: outgoing.filter((edge) => edge.sourcePortId === port.id).length }))}
      activePortKey={connectionSource?.nodeId === node.id ? `${node.id}:${connectionSource.portId}` : null}
      acceptingConnectionKind={connectionSource?.nodeId !== node.id ? connectionSource?.kind : null}
      onClick={onSelect}
      onPortConnect={(portId, direction, kind) => onPortConnect(node.id, portId, direction, kind)}
      onPortPointerDown={onPortPointerDown}
      onPortPointerUp={onPortPointerUp}
      onNodePointerDown={onNodePointerDown}
      footer={primary ? "Default entry" : node.kind}
    />
  );
}

function NodeLibrary({ onAdd, onClose }: { onAdd: (name: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const definitions = [
    { name: "Text Input", category: "Input", description: "Provide text or instructions", icon: <Type />, available: true },
    { name: "Text Output", category: "Output", description: "Display a connected text value", icon: <ArrowUpFromLine />, available: true },
    { name: "Review sources", category: "Human task", description: "Review connected sources and submit a result", icon: <Type />, available: true },
    { name: "Workspace Scan", category: "Workspace", description: "List files and directories in the selected workspace", icon: <FolderOpen />, available: true },
    { name: "Project Analyze", category: "Workspace", description: "Inspect project structure, manifests, languages, tests, and entrypoints", icon: <FileSearch />, available: true },
    { name: "Read Text File", category: "Workspace", description: "Read one UTF-8 text file inside the selected workspace", icon: <FileText />, available: true },
    { name: "File Input", category: "Input", description: "Read a workspace artifact", icon: <FolderOpen />, available: false },
    { name: "Human Approval", category: "Control", description: "Preview: approval executor is not installed", icon: <Pause />, available: false },
    { name: "Event Trigger", category: "Trigger", description: "Preview: event delivery is not installed", icon: <Zap />, available: false },
  ].filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <aside className="node-library" aria-label="Node Library">
      <header><span><Blocks /><strong>Node Library</strong></span><IconButton label="Close node library" size="small" onClick={onClose}><X /></IconButton></header>
      <div className="node-library__search"><TextField aria-label="Search nodes" leadingIcon={<Search />} placeholder="Search nodes" value={query} onChange={(event) => setQuery(event.target.value)} clearable /></div>
      <div className="node-library__list">
        {definitions.map((item) => <button type="button" key={item.name} draggable={item.available} disabled={!item.available} onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-seekwd-node", item.name); event.dataTransfer.setData("text/plain", item.name); }} onClick={() => item.available && onAdd(item.name)}><span className="node-library__icon">{item.icon}</span><span><strong>{item.name}</strong><small>{item.description}</small></span>{item.available ? <Plus /> : <span className="node-library__preview">Preview</span>}</button>)}
        {!definitions.length ? <p>No matching nodes</p> : null}
      </div>
    </aside>
  );
}

function RunHistoryPanel({ canvas, runs, onClose }: { canvas: Canvas; runs: Run[]; onClose: () => void }) {
  const orderedRuns = [...runs].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  return (
    <aside className="run-history" aria-label="Run history">
      <header className="run-history__header"><div><History /><span><strong>Run History</strong><small>{canvas.name}</small></span></div><IconButton label="Close run history" size="small" onClick={onClose}><X /></IconButton></header>
      <div className="run-history__session"><CirclePlay /><span><strong>Canvas session</strong><small>Local Host graph validation</small></span><StatusBadge tone={toRuntimeState(canvas.status) === "running" ? "info" : "neutral"}>{stateLabel(toRuntimeState(canvas.status))}</StatusBadge></div>
      <div className="run-history__list">{orderedRuns.length ? orderedRuns.map((run) => <div className="run-history__item" key={run.id}><span className={`run-history__item-icon is-${run.status === "failed" ? "danger" : run.status === "succeeded" ? "success" : "info"}`}>{run.status === "running" ? <LoaderCircle /> : run.status === "succeeded" ? <CheckCircle2 /> : run.status === "failed" ? <CircleAlert /> : <Clock3 />}</span><span className="run-history__item-copy"><strong>{run.status}</strong><small>Revision {run.revision} · {new Date(run.startedAt).toLocaleString()}</small></span><StatusBadge tone={run.status === "succeeded" ? "success" : run.status === "failed" ? "danger" : "info"}>{run.status}</StatusBadge></div>) : <p className="run-empty">No Host runs for this canvas.</p>}</div>
      <footer className="run-history__footer"><span>Runs are scoped to this canvas.</span></footer>
    </aside>
  );
}

function AgentComposer({
  workspaceName,
  workspaces,
  workspaceId,
  scopeEnabled,
  agentConfigured,
  agentName,
  agentResponse,
  onWorkspaceChange,
  onScopeClear,
  onScopeEnable,
  onNewWorkspace,
  onSubmit,
}: {
  workspaceName: string;
  workspaces: Workspace[];
  workspaceId?: string;
  scopeEnabled: boolean;
  agentConfigured: boolean;
  agentName: string;
  agentResponse: string;
  onWorkspaceChange: (workspace: Workspace) => void;
  onScopeClear: () => void;
  onScopeEnable: () => void;
  onNewWorkspace: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleWorkspaces = workspaces.filter((workspace) => workspace.name.toLowerCase().includes(query.toLowerCase()));
  const submit = () => {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    setValue("");
    setScopePickerOpen(false);
    onSubmit(normalizedValue);
  };
  return (
    <section className="agent-composer" aria-label="Agent conversation">
      <div className="agent-composer__scope-row">
        {scopeEnabled ? (
          <div className="agent-composer__scope">
            <button type="button" className="agent-composer__scope-trigger" onClick={() => setScopePickerOpen((open) => !open)} aria-expanded={scopePickerOpen}>
              <FolderOpen /><span>{workspaceName}</span>
            </button>
            <IconButton label="Remove workspace scope" size="small" className="agent-composer__scope-remove" onClick={() => { onScopeClear(); setScopePickerOpen(false); }}><X /></IconButton>
          </div>
        ) : (
          <button type="button" className="agent-composer__scope-empty" onClick={() => setScopePickerOpen((open) => !open)} aria-expanded={scopePickerOpen}><FolderPlus /><span>Choose workspace</span></button>
        )}
        {scopePickerOpen ? (
          <div className="agent-composer__scope-picker" role="dialog" aria-label="Choose workspace">
            <TextField aria-label="Search workspaces" leadingIcon={<Search />} placeholder="Search workspaces" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="agent-composer__scope-list">
              {visibleWorkspaces.map((workspace) => <button type="button" key={workspace.id} className={workspace.id === workspaceId ? "is-selected" : ""} onClick={() => { onWorkspaceChange(workspace); onScopeEnable(); setScopePickerOpen(false); setQuery(""); }}><Folder /><span>{workspace.name}</span></button>)}
              {!visibleWorkspaces.length ? <span className="agent-composer__scope-empty-state">No matching workspaces</span> : null}
            </div>
            <button type="button" className="agent-composer__new-workspace" onClick={() => { setScopePickerOpen(false); onNewWorkspace(); }}><FolderPlus /><span>New Workspace</span></button>
          </div>
        ) : null}
      </div>
      <div className="agent-composer__surface">
        {agentResponse ? <div className="agent-composer__response"><strong>{agentName}</strong><p>{agentResponse}</p></div> : null}
        <AutoGrowTextArea
          aria-label="Message the agent"
          placeholder={agentConfigured ? "Ask the configured Agent" : "Send a value to the active canvas"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />
        <footer><Tooltip content="Attach context"><IconButton label="Attach context" size="small" disabled><Paperclip /></IconButton></Tooltip><span className="agent-composer__unavailable">{agentConfigured ? agentName : "Canvas input"}</span><span className="agent-composer__spacer" /><Tooltip content={agentConfigured ? "Send to Agent" : "Send value"}><IconButton label={agentConfigured ? "Send to Agent" : "Send value"} active={Boolean(value.trim())} onClick={submit} disabled={!value.trim()}><ArrowUp /></IconButton></Tooltip></footer>
      </div>
    </section>
  );
}

function NodeInspector({ node, canvas, configDraft, onAddPort, onDeleteNode, onFlushNodeConfig, onUpdateNode }: { node?: WireNode; canvas?: Canvas; configDraft?: Record<string, unknown>; onAddPort?: () => void; onDeleteNode?: () => void; onFlushNodeConfig?: (nodeId: string) => void; onUpdateNode?: (nodeId: string, input: { config?: Record<string, unknown> }) => void }) {
  if (!node) return <div className="inspector-empty">Select a node to inspect it.</div>;
  const definition = nodeDefinition(node);
  const isInput = node.kind === "input.text" || node.kind === "input.file";
  const inputValue = typeof configDraft?.inputValue === "string" ? configDraft.inputValue : typeof node.config?.inputValue === "string" ? node.config.inputValue : "";
  const instruction = typeof configDraft?.instruction === "string" ? configDraft.instruction : typeof node.config?.instruction === "string" ? node.config.instruction : "";
  const filePath = typeof configDraft?.path === "string" ? configDraft.path : typeof node.config?.path === "string" ? node.config.path : "";
  const updateConfig = (config: Record<string, unknown>) => onUpdateNode?.(node.id, { config });
  return (
    <>
      <PanelHeader title="Inspector" trailing={<Menu label="Node actions" icon={<MoreHorizontal />} iconOnly items={[{ label: "Delete node", icon: <Trash2 />, onSelect: () => onDeleteNode?.() }]} />} />
      <div className="inspector-summary"><span className="summary-icon">{definition.icon}</span><span><strong>{node.name}</strong><small>{definition.typeLabel}</small></span></div>
      <InspectorSection title="General"><PropertyRow label="Name"><TextField value={node.name} readOnly aria-label="Node name" /></PropertyRow><PropertyRow label="Kind"><code className="inspector-code">{node.kind}</code></PropertyRow></InspectorSection>
      <InspectorSection title="How this node works"><p className="inspector-help">{definition.description}</p>{node.kind === "trigger.start" ? <p className="inspector-help">Start is the single manual entrypoint. It emits a flow signal; it does not hold user text.</p> : null}{isInput ? <PropertyRow label="Value"><TextField aria-label="Node input value" value={inputValue} placeholder={node.kind === "input.file" ? "Workspace file path" : "Enter text for this run"} onChange={(event) => updateConfig({ inputValue: event.target.value })} onBlur={() => onFlushNodeConfig?.(node.id)} /></PropertyRow> : null}{node.kind === "file.read_text" ? <PropertyRow label="Relative path"><TextField aria-label="Workspace-relative file path" value={filePath} placeholder="src/main/java/App.java" onChange={(event) => updateConfig({ path: event.target.value })} onBlur={() => onFlushNodeConfig?.(node.id)} /></PropertyRow> : null}{node.kind === "task.manual" ? <PropertyRow label="Instruction"><TextField aria-label="Node instruction" value={instruction} placeholder="Describe what this task should review or produce" onChange={(event) => updateConfig({ instruction: event.target.value })} onBlur={() => onFlushNodeConfig?.(node.id)} /></PropertyRow> : null}</InspectorSection>
      <InspectorSection title="Execution"><PropertyRow label="Canvas"><span className="value-select">{canvas?.name ?? "Unknown"}</span></PropertyRow><Switch label="Repair on failure" description="Allow structured repair proposals for this node." defaultChecked /></InspectorSection>
      <InspectorSection title="Ports" action={onAddPort ? <IconButton label="Add port" size="small" onClick={onAddPort}><Plus /></IconButton> : undefined}>{node.ports.map((port) => <div className="port-row" key={port.id}><span className={`port-direction is-${port.direction}`} aria-hidden="true">{port.direction === "input" ? <ArrowDownToLine /> : <ArrowUpFromLine />}</span><span>{port.name}</span><code>{port.direction} · {port.kind}</code></div>)}{!node.ports.length ? <span className="inspector-muted">No ports configured.</span> : null}</InspectorSection>
      {onDeleteNode ? <div className="inspector-danger-action"><Button variant="danger" leadingIcon={<Trash2 />} onClick={onDeleteNode}>Delete node</Button></div> : null}
    </>
  );
}

function ConnectionInspector({ edge, nodes, onDelete }: { edge: CanvasEdge; nodes: WireNode[]; onDelete: () => void }) {
  const source = nodes.find((node) => node.id === edge.sourceNodeId);
  const target = nodes.find((node) => node.id === edge.targetNodeId);
  const sourcePort = source?.ports.find((port) => port.id === edge.sourcePortId);
  const targetPort = target?.ports.find((port) => port.id === edge.targetPortId);
  return <><PanelHeader title="Connection" /><div className="connection-inspector"><strong>{source?.name ?? "Unknown"} → {target?.name ?? "Unknown"}</strong><span>{sourcePort?.name ?? "Missing port"} → {targetPort?.name ?? "Missing port"}</span><code>{edge.kind} · {edge.id}</code></div><div className="inspector-danger-action"><Button variant="danger" leadingIcon={<Trash2 />} onClick={onDelete}>Delete connection</Button></div></>;
}

function RunPanel({ run, canvas, nodes, value, onValueChange, onSubmit }: { run?: Run; canvas?: Canvas; nodes: WireNode[]; value: string; onValueChange: (value: string) => void; onSubmit: () => void }) {
  const status = run?.status === "succeeded" ? "success" : run?.status === "failed" ? "error" : run?.status === "waiting_input" ? "waiting" : run?.status === "running" ? "running" : "idle";
  const currentNode = run?.currentNodeId ? nodes.find((node) => node.id === run.currentNodeId) : undefined;
  return (
    <div className={`run-panel ${run?.status === "waiting_input" ? "is-waiting" : ""}`}>
      <PanelHeader title="Run output" trailing={<Toolbar><span className="run-context-label">{canvas?.name ?? "No canvas"}</span><StatusBadge tone={status === "success" ? "success" : status === "error" ? "danger" : status === "waiting" ? "warning" : "info"} dot>{run?.status ?? "No run"}</StatusBadge><IconButton label="Run actions" size="small"><MoreHorizontal /></IconButton></Toolbar>} />
      <div className="run-content"><div className="run-tabs"><button className="is-active">Run</button><button disabled>Logs</button><button disabled>Issues</button></div><div className="run-events">{run ? <><p className="run-disclosure">{run.status === "waiting_input" ? "The local Host reached the next interactive node. Submit its value to continue the graph." : "This run is executed by the local restricted Host. Runtime input, text output, bounded workspace scans, structural project analysis, and explicit workspace file reads are supported."}</p>{run.status === "waiting_input" ? <div className="run-input-card"><strong>{currentNode?.name ?? "Input required"}</strong><span>{run.inputPrompt ?? "Enter a result for the current node."}</span><AutoGrowTextArea aria-label="Node result" maxHeight={120} value={value} onChange={(event) => onValueChange(event.target.value)} placeholder="Enter the value or decision..." /><Button variant="primary" leadingIcon={<ArrowUp />} onClick={onSubmit} disabled={!value.trim()}>Submit value</Button></div> : null}{run.status === "succeeded" && run.result ? <div className="run-result-card"><strong>Output</strong><pre>{run.result}</pre></div> : null}{run.status === "failed" && run.inputPrompt ? <div className="run-error-card"><strong>Run failed</strong><span>{run.inputPrompt}</span></div> : null}<dl className="run-details"><div><dt>Run ID</dt><dd>{run.id}</dd></div><div><dt>Canvas</dt><dd>{canvas?.name ?? "Unknown"}</dd></div><div><dt>Revision</dt><dd>{run.revision}</dd></div><div><dt>Current node</dt><dd>{currentNode?.name ?? (run.status === "succeeded" ? "Completed" : "Preparing")}</dd></div><div><dt>Started</dt><dd>{new Date(run.startedAt).toLocaleString()}</dd></div><div><dt>Finished</dt><dd>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "In progress"}</dd></div></dl></> : <p className="run-empty">No Host run has been started.</p>}</div></div>
    </div>
  );
}

function SurfacePage({ surface, workspaceName, settings, onSettingsChange, agentSettings, agentKeyConfigured, onAgentSettingsChange, onAgentKeyConfigured, onNotice }: { surface: Exclude<Surface, "canvas">; workspaceName: string; settings: SettingsState; onSettingsChange: (key: keyof SettingsState, value: SettingsState[keyof SettingsState]) => void; agentSettings: AgentSettings; agentKeyConfigured: boolean; onAgentSettingsChange: (key: keyof AgentSettings, value: string) => void; onAgentKeyConfigured: (configured: boolean) => void; onNotice: (title: string, message: string, severity?: Notice["severity"]) => void }) {
  if (surface === "settings") return <SettingsPage settings={settings} onChange={onSettingsChange} agentSettings={agentSettings} agentKeyConfigured={agentKeyConfigured} onAgentSettingsChange={onAgentSettingsChange} onAgentKeyConfigured={onAgentKeyConfigured} onDefaultProjectParentChange={(path) => onSettingsChange("defaultProjectParent", path)} onNotice={onNotice} />;
  const config: Record<Exclude<Surface, "canvas" | "settings">, { eyebrow: string; title: string; description: string; icon: ReactNode }> = {
    automations: { eyebrow: "Workspace automation", title: "Automations", description: "Schedule canvas entrypoints and keep recurring work visible.", icon: <CalendarClock /> },
    extensions: { eyebrow: "Workspace capabilities", title: "Extensions", description: "Connect approved capabilities to the active workspace.", icon: <Blocks /> },
    files: { eyebrow: "Workspace content", title: "Files", description: `Browse artifacts available to ${workspaceName}.`, icon: <Folder /> },
    environments: { eyebrow: "Execution boundary", title: "Environments", description: "Choose where nodes execute and inspect active safety limits.", icon: <ShieldCheck /> },
    agents: { eyebrow: "Delegated work", title: "Agents", description: "Manage agents that can propose structured work.", icon: <Bot /> },
  };
  const item = config[surface];
  return <div className="surface-page"><SurfaceHeader {...item} action={surface === "automations" ? <Button variant="primary" leadingIcon={<Plus />} disabled title="Scheduler API is not available in this MVP">New Automation</Button> : undefined} /><SurfaceSection title={surface === "automations" ? "Schedules" : surface === "extensions" ? "Extension catalog" : surface === "files" ? "Recent files" : surface === "environments" ? "Execution profiles" : "Workspace agents"} description="Only operations backed by the local Host are enabled in this MVP."><SurfaceContent surface={surface} onNotice={onNotice} /></SurfaceSection></div>;
}

function SurfaceContent({ surface, onNotice }: { surface: Exclude<Surface, "canvas" | "settings">; onNotice: (title: string, message: string, severity?: Notice["severity"]) => void }) {
  if (surface === "automations") return <div className="automation-list"><article className="automation-row"><div className="automation-row__icon"><CalendarClock /></div><div className="automation-row__main"><div className="automation-row__title"><strong>Scheduler API</strong><StatusBadge tone="neutral">Unavailable</StatusBadge></div><span>Automation persistence and execution are not part of this MVP.</span><small>Use the canvas Run action for a real local Host run.</small></div><div className="automation-row__controls"><Switch label="" aria-label="Scheduler unavailable" disabled /><Menu label="Automation actions" icon={<MoreHorizontal />} iconOnly items={[{ label: "Run now", icon: <Play />, disabled: true, onSelect: () => undefined }, { label: "Edit", icon: <Pencil />, disabled: true, onSelect: () => undefined }]} /></div></article></div>;
  if (surface === "extensions") return <div className="extension-grid"><article className="extension-card is-installed"><div className="extension-card__top"><div className="extension-card__icon"><Code2 /></div><div className="extension-card__heading"><strong>Local Restricted Runtime</strong><span>Seekwd · v0.1</span></div><StatusBadge tone="success" dot>Host active</StatusBadge></div><p>Current MVP policy: read-only workspace boundary, no network, cancellable Host process.</p><div className="extension-card__footer"><Switch label="" aria-label="Runtime is managed by Host" checked disabled /><div className="extension-card__actions"><Button size="small" disabled title="Permission management API is not available in this MVP">View permissions</Button><Menu label="Extension actions" icon={<MoreHorizontal />} iconOnly items={[{ label: "Open documentation", icon: <ExternalLink />, disabled: true, onSelect: () => undefined }, { label: "Uninstall", icon: <Trash2 />, disabled: true, onSelect: () => undefined }]} /></div></div></article></div>;
  if (surface === "files") return <div className="file-list">{["research-notes.md", "citation-review.json", "experiment-report.md", "sources.bib"].map((file, index) => <div className="file-list__row" key={file}><FileCode2 /><span><strong>{file}</strong><small>{index % 2 ? "Generated artifact" : "Workspace file"} · Host file API not connected</small></span><StatusBadge tone="neutral">Read-only</StatusBadge></div>)}</div>;
  if (surface === "environments") return <div className="environment-list"><div className="environment-list__row is-selected"><div><strong>Local Restricted</strong><span>Read-only workspace · no network · cancellable</span></div><StatusBadge tone="success" dot>Active</StatusBadge></div><div className="environment-list__row"><div><strong>Docker Sandbox</strong><span>Requires a sandbox worker that is not installed.</span></div><StatusBadge tone="neutral">Unavailable</StatusBadge></div></div>;
  return <div className="agent-list"><div className="agent-row"><div className="agent-avatar"><Bot /></div><div><strong>Agent Runtime</strong><span>Natural-language graph changes are not connected in this MVP.</span><small>Use node, port, edge, revision and Run actions directly.</small></div><Switch label="" aria-label="Agent runtime unavailable" disabled /></div></div>;
}

function SettingsPage({ settings, onChange, agentSettings, agentKeyConfigured, onAgentSettingsChange, onAgentKeyConfigured, onDefaultProjectParentChange, onNotice }: { settings: SettingsState; onChange: (key: keyof SettingsState, value: boolean) => void; agentSettings: AgentSettings; agentKeyConfigured: boolean; onAgentSettingsChange: (key: keyof AgentSettings, value: string) => void; onAgentKeyConfigured: (configured: boolean) => void; onDefaultProjectParentChange: (path: string) => void; onNotice: (title: string, message: string, severity?: Notice["severity"]) => void }) {
  const [apiKey, setApiKey] = useState("");
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const chooseDefaultProjectParent = async () => {
    try {
      const path = await open({ directory: true, multiple: false, title: "Choose default project folder" });
      if (typeof path === "string") {
        onDefaultProjectParentChange(path);
        onNotice("Default project folder updated", path, "success");
      }
    } catch (error) {
      onNotice("Unable to choose project folder", typeof error === "string" ? error : "The folder picker could not be opened.", "error");
    }
  };
  const saveApiKey = async () => {
    setSavingApiKey(true);
    try {
      await invoke("save_agent_api_key", { apiKey });
      onAgentKeyConfigured(Boolean(apiKey.trim()));
      setApiKey("");
      onNotice(apiKey.trim() ? "Agent API key saved" : "Agent API key removed", "The key is stored in the local Windows Credential Manager.", "success");
    } catch (error) {
      onNotice("Unable to save Agent API key", typeof error === "string" ? error : "The local credential store is unavailable.", "error");
    } finally {
      setSavingApiKey(false);
    }
  };
  const testAgent = async () => {
    setTestingAgent(true);
    try {
      const message = await invoke<string>("test_agent_provider", { endpoint: agentSettings.endpoint, model: agentSettings.model });
      onNotice("Agent connection verified", message, "success");
    } catch (error) {
      onNotice("Agent connection failed", typeof error === "string" ? error : "Unable to reach the configured Agent endpoint.", "error");
    } finally {
      setTestingAgent(false);
    }
  };
  return <div className="settings-page"><SurfaceHeader eyebrow="Application preferences" title="Settings" description="Control how Seekwd looks, runs and reports work." icon={<Settings />} /><div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections"><button type="button" className="is-active"><SlidersHorizontal /><span>General</span><ChevronRight /></button><button type="button"><Bell /><span>Notifications</span><ChevronRight /></button><button type="button"><ShieldCheck /><span>Execution</span><ChevronRight /></button><button type="button"><KeyRound /><span>Privacy</span><ChevronRight /></button></nav><div className="settings-content"><SurfaceSection title="General" description="Appearance and local execution preferences."><div className="settings-path-row"><div><strong>Default project folder</strong><p>{settings.defaultProjectParent || "User home folder / SeekwdProjects"}</p><small>New projects use this folder unless you choose another location.</small></div><div className="settings-path-actions"><Button size="small" leadingIcon={<FolderOpen />} onClick={() => void chooseDefaultProjectParent()}>Choose folder</Button><Button size="small" onClick={() => onDefaultProjectParentChange("")} disabled={!settings.defaultProjectParent}>Reset</Button></div></div><Switch label="Compact sidebar" description="Use tighter navigation rows when you work with many canvases." checked={settings.compactSidebar} onChange={(event) => onChange("compactSidebar", event.target.checked)} /><Switch label="Reduce motion" description="Prefer immediate transitions and fewer animated indicators." checked={settings.reduceMotion} onChange={(event) => onChange("reduceMotion", event.target.checked)} /><Switch label="Successful run notifications" description="Show a notification when a canvas finishes successfully." checked={settings.notifySuccess} onChange={(event) => onChange("notifySuccess", event.target.checked)} /><Switch label="Failed run notifications" description="Show a notification when a run needs attention." checked={settings.notifyFailure} onChange={(event) => onChange("notifyFailure", event.target.checked)} /><Switch label="Allow background runs" description="Keep approved runs active after the window is closed." checked={settings.allowBackgroundRuns} onChange={(event) => onChange("allowBackgroundRuns", event.target.checked)} /><Switch label="Confirm destructive actions" description="Ask before deleting workspaces, canvases or artifacts." checked={settings.confirmDestructive} onChange={(event) => onChange("confirmDestructive", event.target.checked)} /></SurfaceSection><SurfaceSection title="Agent provider" description="Connect a local OpenAI-compatible Agent endpoint. API keys stay in the Windows Credential Manager."><div className="agent-settings-grid"><TextField label="Agent name" value={agentSettings.name} onChange={(event) => onAgentSettingsChange("name", event.target.value)} placeholder="Local Agent" /><TextField label="Endpoint" value={agentSettings.endpoint} onChange={(event) => onAgentSettingsChange("endpoint", event.target.value)} placeholder="https://api.example.com/v1" /><TextField label="Model" value={agentSettings.model} onChange={(event) => onAgentSettingsChange("model", event.target.value)} placeholder="gpt-4o-mini" /><TextField label="API key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={agentKeyConfigured ? "Saved in Windows Credential Manager" : "Enter API key"} description={agentKeyConfigured ? "A key is configured. Enter a new key to replace it, or clear and save to remove it." : "The key is never stored in browser storage or project files."} /></div><TextField label="Agent instructions" value={agentSettings.instructions} onChange={(event) => onAgentSettingsChange("instructions", event.target.value)} placeholder="Describe the response style or project conventions." /><label className="form-select"><span>Execution environment</span><select value={agentSettings.environment} onChange={(event) => onAgentSettingsChange("environment", event.target.value)}><option>Response only</option><option>Local Restricted (planned tools)</option><option>Workspace Read/Write (planned tools)</option></select></label><p className="settings-inline-note">The current connection can chat and propose work. File, shell and graph-editing tools are not granted yet.</p><div className="agent-settings-actions"><StatusBadge tone={agentKeyConfigured ? "success" : "neutral"} dot>{agentKeyConfigured ? "API key configured" : "API key not configured"}</StatusBadge><span className="agent-settings-spacer" /><Button size="small" onClick={() => void saveApiKey()} disabled={savingApiKey}>{savingApiKey ? "Saving..." : "Save key"}</Button><Button size="small" onClick={() => void testAgent()} disabled={testingAgent || !agentKeyConfigured || !agentSettings.endpoint.trim() || !agentSettings.model.trim()}>{testingAgent ? "Testing..." : "Test connection"}</Button></div></SurfaceSection></div></div></div>;
}

function SurfaceHeader({ eyebrow, title, description, icon, action }: { eyebrow: string; title: string; description: string; icon: ReactNode; action?: ReactNode }) {
  return <header className="surface-header"><div className="surface-header__icon">{icon}</div><div className="surface-header__copy"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action ? <div className="surface-header__action">{action}</div> : null}</header>;
}

function SurfaceSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="surface-section"><div className="surface-section__heading"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div></div>{children}</section>;
}

function validateCanvasGraphForUi(canvas: Canvas | undefined, nodes: WireNode[], edges: CanvasEdge[]): GraphValidation {
  if (!canvas) return { valid: false, message: "Select a canvas before running." };
  if (!canvas.defaultEntrypointNodeId) return { valid: false, message: "This canvas has no manual entrypoint. Configure an entrypoint only if it should be run directly." };
  if (!nodes.length) return { valid: false, message: "This canvas has no nodes. Add nodes before configuring a manual entrypoint." };
  const entry = nodes.find((node) => node.id === canvas.defaultEntrypointNodeId);
  if (!entry) return { valid: false, message: "The configured entry node is missing from this canvas." };
  const runtimeGraph = toRuntimeGraphDocument(canvas, nodes, edges);
  const runtimeValidation = validateRuntimeGraph(runtimeGraph, "workflow");
  if (!runtimeValidation.valid) {
    return { valid: false, message: runtimeValidation.errors[0]?.message ?? "The graph contains an invalid connection." };
  }
  const supportedKinds = new Set(["trigger.start", "input.text", "task.manual", "output.text", "workspace.scan", "workspace.analyze", "file.read_text"]);
  const unsupported = nodes.find((node) => !supportedKinds.has(node.kind));
  if (unsupported) return { valid: false, message: `${unsupported.name} uses ${unsupported.kind}, which is not executable in this MVP.` };
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const source = nodeById.get(edge.sourceNodeId);
    const target = nodeById.get(edge.targetNodeId);
    if (!source || !target) return { valid: false, message: "A connection points to a node outside this canvas." };
    const sourcePort = source.ports.find((port) => port.id === edge.sourcePortId);
    const targetPort = target.ports.find((port) => port.id === edge.targetPortId);
    if (!sourcePort || !targetPort) return { valid: false, message: "A connection points to a missing port." };
  }
  for (const edge of runtimeGraph.edges.filter((edge) => edge.kind === "control" || edge.kind === "data" || edge.kind === "event")) {
    const next = adjacency.get(edge.source.nodeId) ?? [];
    next.push(edge.target.nodeId);
    adjacency.set(edge.source.nodeId, next);
  }
  const reachable = new Set<string>();
  const queue = [entry.id];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    queue.push(...(adjacency.get(id) ?? []));
  }
  const unreachable = nodes.find((node) => !reachable.has(node.id) && !isPassiveSourceNode(node));
  if (unreachable) {
    return {
      valid: false,
      message: `Connect ${unreachable.name} to the selected entrypoint flow path before running.`,
    };
  }
  for (const reader of nodes.filter((node) => node.kind === "file.read_text")) {
    const pathPort = reader.ports.find((port) => port.name === "Path" && port.direction === "input");
    const connectedPath = edges.some((edge) => edge.targetPortId === pathPort?.id);
    const configuredPath = typeof reader.config?.path === "string" ? reader.config.path.trim() : "";
    if (!connectedPath && !configuredPath) {
      return {
        valid: false,
        message: `Set a workspace-relative path on ${reader.name}, or connect a Text Input to its Path port.`,
      };
    }
  }
  for (const output of nodes.filter((node) => node.kind === "output.text")) {
    const input = output.ports.find((port) => port.name === "Input" && port.direction === "input");
    const dataEdge = edges.find((edge) => edge.targetPortId === input?.id);
    if (!input || !dataEdge) return { valid: false, message: `Connect a Text Input, Workspace Scan, Project Analyze, or Read Text File node to ${output.name}.Input before running.` };
    const source = nodeById.get(dataEdge.sourceNodeId);
    if (source?.kind === "input.text") {
      const value = typeof source.config?.inputValue === "string" ? source.config.inputValue.trim() : "";
      // An input node used as the selected entrypoint is a runtime input
      // source. It is valid to start with an empty value; the Host will put
      // the run into waiting_input and the Run panel will collect the value.
      if (!value && source.id !== canvas.defaultEntrypointNodeId) {
        return { valid: false, message: `Set a value on ${source.name} before running, or make it the canvas entrypoint.` };
      }
    } else if (source?.kind !== "workspace.scan" && source?.kind !== "workspace.analyze" && source?.kind !== "file.read_text") {
      return { valid: false, message: `${output.name} accepts Text Input, Workspace Scan, Project Analyze, or Read Text File nodes.` };
    }
  }
  return { valid: true, message: "Canvas is ready to run." };
}

function isPassiveSourceNode(node: WireNode) {
  return node.kind === "input.text" || node.kind === "input.file" || node.kind === "workspace.scan";
}

function nodeDefinition(node: WireNode) {
  const inputs = node.ports.filter((port) => port.direction === "input").map((port) => ({ id: port.id, label: port.name, kind: port.kind }));
  const outputs = node.ports.filter((port) => port.direction === "output").map((port) => ({ id: port.id, label: port.name, kind: port.kind }));
  const icon = node.kind === "trigger.start" ? <CirclePlay /> : node.kind === "workspace.analyze" ? <FileSearch /> : node.kind === "file.read_text" ? <FileText /> : node.kind.includes("file") ? <FolderOpen /> : node.kind.includes("approval") ? <Pause /> : node.kind.includes("event") ? <Zap /> : node.kind === "task.manual" ? <Type /> : node.kind === "output.text" ? <ArrowUpFromLine /> : <Bot />;
  const typeLabel = node.kind === "trigger.start" ? "Canvas entry" : node.kind === "task.manual" ? "Task" : node.kind === "input.text" ? "Text input" : node.kind === "output.text" ? "Text output" : node.kind === "workspace.scan" ? "Workspace scan" : node.kind === "workspace.analyze" ? "Project analysis" : node.kind === "file.read_text" ? "Text file reader" : node.kind.includes("file") ? "File input" : node.kind.includes("approval") ? "Human input" : node.kind.includes("event") ? "Event trigger" : "Agent task";
  const description = node.kind === "trigger.start"
    ? "Manual entrypoint. Starting the canvas emits a flow signal from this node."
    : node.kind === "input.text"
      ? "Runtime value source. Enter text in the Inspector, then connect Text to a compatible data input."
      : node.kind === "input.file"
        ? "Workspace resource source. Provide a permitted file path, then connect File to a resource input."
        : node.kind === "control.approval"
          ? "Pauses the graph until a human approves the incoming request."
          : node.kind === "trigger.event"
            ? "External event source. It can begin a named event path when the Host receives a matching event."
            : node.kind === "task.manual"
              ? "Manual review task. It receives connected inputs and waits for a human result; it does not call an Agent by itself."
              : node.kind === "workspace.scan"
                ? "Read-only workspace inventory. It lists files and directories without reading file contents."
              : node.kind === "workspace.analyze"
                ? "Read-only structural project analysis. It inspects manifests, file types, tests, and likely entrypoints inside the selected workspace."
              : node.kind === "file.read_text"
                ? "Read one UTF-8 text file by workspace-relative path. Absolute paths, parent traversal, symbolic links, and files over the configured limit are rejected."
              : node.kind === "output.text"
                ? "Text output. It displays a value received from a connected Text Input node in Run Output."
              : "Agent task. This node requires an Agent Runtime capability before it can execute.";
  return { typeLabel, icon, inputs, outputs, description };
}

function nodeKindForName(name: string) {
  if (name === "Text Input") return "input.text";
  if (name === "Text Output") return "output.text";
  if (name === "File Input") return "input.file";
  if (name === "Workspace Scan") return "workspace.scan";
  if (name === "Project Analyze") return "workspace.analyze";
  if (name === "Read Text File") return "file.read_text";
  if (name === "Review sources") return "task.manual";
  if (name === "Human Approval") return "control.approval";
  if (name === "Event Trigger") return "trigger.event";
  return "task.manual";
}

function nodePosition(index: number) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return { x: 80 + column * 320, y: 145 + row * 145, cssLeft: `${4 + column * 32}%`, cssTop: `${24 + row * 22}%` };
}

function toRuntimeState(status?: string): RuntimeState {
  if (status === "running" || status === "queued") return "running";
  if (status === "waiting_input") return "waiting";
  if (status === "succeeded") return "success";
  if (status === "failed") return "error";
  return "idle";
}

function aggregateState(states: RuntimeState[]): RuntimeState {
  return (["error", "waiting", "running", "success", "idle"] as RuntimeState[]).find((state) => states.includes(state)) ?? "idle";
}

function stateLabel(state: RuntimeState) {
  return { idle: "Ready", running: "Running", waiting: "Waiting", success: "Completed", error: "Failed" }[state];
}

function isProjectAnalysisRequest(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  return (
    (normalized.includes("分析") && (normalized.includes("项目") || normalized.includes("代码")))
    || /\b(analy[sz]e|inspect|review)\b.*\b(project|codebase|repository|repo|backend)\b/.test(normalized)
  );
}

function surfaceTitle(surface: Surface) {
  return surface[0].toUpperCase() + surface.slice(1);
}

function noticeIcon(severity: Notice["severity"]) {
  if (severity === "success") return <CheckCircle2 />;
  if (severity === "error") return <CircleAlert />;
  if (severity === "warning") return <TriangleAlert />;
  return <Sparkles />;
}

async function resolveHostClient(): Promise<HostClient> {
  if (import.meta.env.VITE_HOST_PROXY === "0") {
    return createLocalHostClient();
  }
  if ("__TAURI_INTERNALS__" in globalThis) {
    const connection = await invoke<{ baseUrl: string; token: string }>("get_host_connection");
    return createHttpHostClient(connection.baseUrl, connection.token);
  }
  return createHttpHostClient("");
}

async function bootstrap() {
  const client = await resolveHostClient();
  createRoot(document.getElementById("root")!).render(<StrictMode><App client={client} /></StrictMode>);
}

void bootstrap();
