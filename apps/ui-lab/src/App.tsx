import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUp,
  Bell,
  Bot,
  Box,
  Braces,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Blocks,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CirclePlay,
  Clock3,
  Cloud,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  FileCode2,
  Folder,
  FolderOpen,
  FolderPlus,
  GitFork,
  History,
  KeyRound,
  LoaderCircle,
  Minus,
  Moon,
  MoreHorizontal,
  PanelBottom,
  PanelRight,
  PanelsTopLeft,
  Paperclip,
  Pause,
  Play,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Settings,
  Pencil,
  Trash2,
  TriangleAlert,
  UserRoundCog,
  Sun,
  Type,
  X,
  Zap,
} from "lucide-react";
import {
  Button,
  CanvasNode,
  Checkbox,
  Dialog,
  IconButton,
  InspectorSection,
  Menu,
  MessageBox,
  Notification,
  PanelHeader,
  Progress,
  PropertyRow,
  SegmentedControl,
  SidebarItem,
  SidebarSection,
  StatusBadge,
  Switch,
  TextField,
  Toolbar,
  ToolbarDivider,
  Tooltip,
  WindowFrame,
} from "@seekwd/ui";
import { mockApi, useWorkbenchSnapshot } from "./mock/store";

type Theme = "dark" | "light";
type LabView = "workbench" | "components";
type WorkbenchSurface = "canvas" | "automations" | "extensions" | "settings" | "files" | "environments" | "agents";
type ManagedKind = "workspace" | "canvas" | "node";
interface ManagedTarget { kind: ManagedKind; id?: string; name: string }
interface NodeSummary { id: string; name: string; primary?: boolean }
type CanvasRuntimeState = "idle" | "running" | "waiting" | "success" | "error";

interface AutomationRecord {
  id: string;
  name: string;
  canvas: string;
  schedule: string;
  nextRun: string;
  lastRun: string;
  enabled: boolean;
}

interface ExtensionRecord {
  id: string;
  name: string;
  description: string;
  version: string;
  publisher: string;
  enabled: boolean;
  updateAvailable?: boolean;
  installed: boolean;
  icon: ReactNode;
}

interface AppNotice {
  id: string;
  title: string;
  message: string;
  tone?: "success" | "info";
  duration?: number;
}

interface SettingsState {
  compactSidebar: boolean;
  reduceMotion: boolean;
  notifySuccess: boolean;
  notifyFailure: boolean;
  confirmDestructive: boolean;
  reopenLastWorkspace: boolean;
  allowBackgroundRuns: boolean;
  telemetry: boolean;
}

function aggregateCanvasState(states: CanvasRuntimeState[]): CanvasRuntimeState {
  return (["error", "waiting", "running", "success", "idle"] as const).find((state) => states.includes(state)) ?? "idle";
}

export function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [view, setView] = useState<LabView>("components");

  return (
    <div className="lab" data-sk-theme={theme} data-sk-view={view}>
      <header className="lab-header">
        <div>
          <strong>Seekwd UI</strong>
          <span>macOS-inspired workbench foundation</span>
        </div>
        <SegmentedControl
          label="Preview"
          value={view}
          onChange={setView}
          options={[{ value: "workbench", label: "Workbench" }, { value: "components", label: "Components" }]}
        />
        <Tooltip content={theme === "dark" ? "Use light appearance" : "Use dark appearance"}>
          <IconButton label={theme === "dark" ? "Use light appearance" : "Use dark appearance"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun /> : <Moon />}
          </IconButton>
        </Tooltip>
      </header>
      {view === "workbench" ? <WorkbenchPreview /> : <ComponentGallery />}
    </div>
  );
}

function WorkbenchPreview() {
  const mockSnapshot = useWorkbenchSnapshot();
  const [surface, setSurface] = useState<WorkbenchSurface>("canvas");
  const [bottomOpen, setBottomOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("Thesis Workspace");
  const [workspaceNames, setWorkspaceNames] = useState(["Thesis Workspace", "Research Workspace", "OpenMAIC"]);
  const [canvasName, setCanvasName] = useState("Experiment Report");
  const [canvasNames, setCanvasNames] = useState(["Experiment Report", "Source Analysis", "Citation Review"]);
  const [nodes, setNodes] = useState<NodeSummary[]>([
    { id: "research-topic", name: "Research Topic", primary: true },
    { id: "draft-report", name: "Draft Experiment Report" },
    { id: "review-structure", name: "Review Report Structure" },
  ]);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [draftWorkspaceName, setDraftWorkspaceName] = useState("");
  const [draftWorkspace, setDraftWorkspace] = useState("");
  const [canvasStarted, setCanvasStarted] = useState(false);
  const [composerScopeEnabled, setComposerScopeEnabled] = useState(true);
  const [nodeLibraryOpen, setNodeLibraryOpen] = useState(false);
  const [runHistoryOpen, setRunHistoryOpen] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [renameTarget, setRenameTarget] = useState<ManagedTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedTarget | null>(null);
  const [canvasStates, setCanvasStates] = useState<Record<string, CanvasRuntimeState>>({
    "Experiment Report": "idle",
    "Source Analysis": "error",
    "Citation Review": "running",
    "Literature Survey": "success",
    "Evaluation Plan": "idle",
    "Java Course": "waiting",
  });
  const [activeRunCanvas, setActiveRunCanvas] = useState<string | null>(null);
  const [appNotices, setAppNotices] = useState<AppNotice[]>([]);
  const [automations, setAutomations] = useState<AutomationRecord[]>([
    { id: "morning-review", name: "Morning literature review", canvas: "Citation Review", schedule: "Every weekday at 09:00", nextRun: "Mon, 09:00", lastRun: "Today, 09:01 · Succeeded", enabled: true },
    { id: "weekly-report", name: "Weekly experiment digest", canvas: "Experiment Report", schedule: "Every Friday at 17:30", nextRun: "Fri, 17:30", lastRun: "Sep 12, 17:34 · Succeeded", enabled: true },
    { id: "source-watch", name: "Source change monitor", canvas: "Source Analysis", schedule: "Every 6 hours", nextRun: "Paused", lastRun: "Yesterday, 18:00 · Failed", enabled: false },
  ]);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [automationName, setAutomationName] = useState("");
  const [automationCanvas, setAutomationCanvas] = useState("Experiment Report");
  const [automationSchedule, setAutomationSchedule] = useState("Every weekday at 09:00");
  const [extensions, setExtensions] = useState<ExtensionRecord[]>([
    { id: "github", name: "GitHub", description: "Read repositories, issues and pull requests from workspace flows.", version: "2.4.1", publisher: "Seekwd", enabled: true, installed: true, icon: <GitFork /> },
    { id: "filesystem", name: "Workspace Files", description: "Structured file access constrained to the active workspace.", version: "1.8.0", publisher: "Seekwd", enabled: true, installed: true, icon: <FolderOpen /> },
    { id: "postgres", name: "PostgreSQL", description: "Query approved databases through parameterized operations.", version: "1.2.3", publisher: "Seekwd Labs", enabled: false, installed: true, updateAvailable: true, icon: <Database /> },
    { id: "browser", name: "Browser Control", description: "Drive browser sessions with explicit host and data boundaries.", version: "0.9.6", publisher: "Seekwd Labs", enabled: false, installed: false, icon: <Cloud /> },
    { id: "python", name: "Python Runtime", description: "Run isolated Python tasks in restricted environments.", version: "1.0.0", publisher: "Community", enabled: false, installed: false, icon: <Code2 /> },
  ]);
  const [settingsSection, setSettingsSection] = useState("general");
  const [settingsState, setSettingsState] = useState<SettingsState>({ compactSidebar: false, reduceMotion: false, notifySuccess: true, notifyFailure: true, confirmDestructive: true, reopenLastWorkspace: true, allowBackgroundRuns: false, telemetry: false });

  const pushNotice = (notice: Omit<AppNotice, "id">) => {
    const nextNotice = { ...notice, id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, duration: notice.duration ?? 5000 };
    setAppNotices((items) => [nextNotice, ...items].slice(0, 4));
  };

  const dismissNotice = (noticeId: string) => setAppNotices((items) => items.filter((item) => item.id !== noticeId));

  useEffect(() => {
    if (!mockSnapshot.workspaces.length) return;
    const activeWorkspace = mockSnapshot.workspaces.find((workspace) => workspace.name === workspaceName) ?? mockSnapshot.workspaces[0];
    if (!activeWorkspace) return;
    setWorkspaceNames(mockSnapshot.workspaces.map((workspace) => workspace.name));
    if (activeWorkspace.name !== workspaceName) setWorkspaceName(activeWorkspace.name);
    mockApi.listCanvases(activeWorkspace.id).then((canvases) => {
      if (!canvases.length) return;
      setCanvasNames(canvases.map((canvas) => canvas.name));
      setCanvasStates(Object.fromEntries(canvases.map((canvas) => [canvas.name, canvas.status])) as Record<string, CanvasRuntimeState>);
      if (!canvases.some((canvas) => canvas.name === canvasName)) setCanvasName(canvases[0].name);
    });
  }, [mockSnapshot.workspaces]);

  useEffect(() => mockApi.subscribe((event) => {
    if (event.type === "canvas.updated") {
      setCanvasStates((states) => ({ ...states, [event.canvas.name]: event.canvas.status as CanvasRuntimeState }));
      if (event.canvas.status === "success" && event.canvas.latestRunId) {
        pushNotice({ title: "Canvas completed", message: `${event.canvas.name} finished successfully. Review its output and artifacts.`, duration: 7000 });
      }
      if (event.canvas.status === "success" || event.canvas.status === "error") setActiveRunCanvas(null);
    }
  }), []);

  useEffect(() => {
    if (!activeRunCanvas) return;
    const timer = window.setTimeout(() => {
      setCanvasStates((states) => ({ ...states, [activeRunCanvas]: "success" }));
      setActiveRunCanvas(null);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [activeRunCanvas]);

  const createWorkspace = () => {
    const nextName = draftWorkspaceName.trim();
    if (!nextName || !draftWorkspace) return;
    setWorkspaceName(nextName);
    setWorkspaceNames((names) => names.includes(nextName) ? names : [...names, nextName]);
    setCanvasName("Untitled Canvas");
    setCanvasNames(["Untitled Canvas"]);
    setNodes([]);
    setCanvasStates((states) => ({ ...states, "Untitled Canvas": "idle" }));
    setDraftWorkspaceName("");
    setCanvasStarted(false);
    setComposerScopeEnabled(true);
    setNewWorkspaceOpen(false);
  };

  const openNewWorkspace = () => {
    setDraftWorkspaceName("");
    setDraftWorkspace("");
    setNewWorkspaceOpen(true);
  };

  const createCanvas = () => {
    const nextName = `Untitled Canvas ${canvasNames.length + 1}`;
    setCanvasNames((names) => [...names, nextName]);
    setCanvasName(nextName);
    setCanvasStates((states) => ({ ...states, [nextName]: "idle" }));
    setCanvasStarted(false);
    setComposerScopeEnabled(true);
    setSurface("canvas");
  };

  const navigate = (next: WorkbenchSurface) => {
    setSurface(next);
    if (next !== "canvas") { setBottomOpen(false); setNodeLibraryOpen(false); setRunHistoryOpen(false); }
  };
  const selectCanvas = (name: string) => { setCanvasName(name); setSurface("canvas"); };
  const openAutomationDialog = (automation?: AutomationRecord) => {
    setEditingAutomationId(automation?.id ?? null);
    setAutomationName(automation?.name ?? "");
    setAutomationCanvas(automation?.canvas ?? canvasNames[0] ?? "Experiment Report");
    setAutomationSchedule(automation?.schedule ?? "Every weekday at 09:00");
    setAutomationDialogOpen(true);
  };
  const saveAutomation = () => {
    const name = automationName.trim();
    if (!name) return;
    if (editingAutomationId) setAutomations((items) => items.map((item) => item.id === editingAutomationId ? { ...item, name, canvas: automationCanvas, schedule: automationSchedule } : item));
    else setAutomations((items) => [{ id: `automation-${Date.now()}`, name, canvas: automationCanvas, schedule: automationSchedule, nextRun: "Tomorrow, 09:00", lastRun: "Never", enabled: true }, ...items]);
    setAutomationDialogOpen(false);
    pushNotice({ title: editingAutomationId ? "Automation updated" : "Automation created", message: `${name} is ready.` });
  };
  const updateSetting = (key: keyof typeof settingsState, value: boolean) => setSettingsState((state) => ({ ...state, [key]: value }));

  const startRename = (kind: ManagedKind, name: string, id?: string) => {
    setRenameTarget({ kind, name, id });
    setRenameValue(name);
  };

  const confirmRename = () => {
    const nextName = renameValue.trim();
    if (!renameTarget || !nextName) return;
    if (renameTarget.kind === "workspace") {
      setWorkspaceNames((names) => names.map((name) => name === renameTarget.name ? nextName : name));
      if (workspaceName === renameTarget.name) setWorkspaceName(nextName);
    }
    if (renameTarget.kind === "canvas") {
      setCanvasNames((names) => names.map((name) => name === renameTarget.name ? nextName : name));
      setCanvasStates((states) => {
        const { [renameTarget.name]: state = "idle", ...rest } = states;
        return { ...rest, [nextName]: state };
      });
      if (canvasName === renameTarget.name) setCanvasName(nextName);
    }
    if (renameTarget.kind === "node") setNodes((items) => items.map((node) => node.id === renameTarget.id ? { ...node, name: nextName } : node));
    setRenameTarget(null);
    setRenameValue("");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "workspace") {
      const remaining = workspaceNames.filter((name) => name !== deleteTarget.name);
      setWorkspaceNames(remaining);
      if (workspaceName === deleteTarget.name) {
        setWorkspaceName(remaining[0] ?? "No Workspace");
        setCanvasNames([]);
        setCanvasName("No Canvas");
        setNodes([]);
        setCanvasStarted(false);
      }
    }
    if (deleteTarget.kind === "canvas") {
      const remaining = canvasNames.filter((name) => name !== deleteTarget.name);
      setCanvasNames(remaining);
      setCanvasStates((states) => {
        const { [deleteTarget.name]: _deleted, ...rest } = states;
        return rest;
      });
      if (canvasName === deleteTarget.name) {
        const next = remaining[0] ?? "No Canvas";
        setCanvasName(next);
        if (!remaining.length) setNodes([]);
      }
    }
    if (deleteTarget.kind === "node") setNodes((items) => items.filter((node) => node.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const addNode = (name: string) => setNodes((items) => [...items, { id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, name }]);
  const setPrimaryNode = (nodeId: string) => setNodes((items) => items.map((node) => ({ ...node, primary: node.id === nodeId })));
  const runCanvas = () => {
    if (!nodes.some((node) => node.primary)) return;
    const workspace = mockSnapshot.workspaces.find((item) => item.name === workspaceName);
    if (!workspace) return;
    mockApi.listCanvases(workspace.id).then((canvases) => {
      const canvas = canvases.find((item) => item.name === canvasName);
      if (!canvas) return;
      setCanvasStates((states) => ({ ...states, [canvas.name]: "running" }));
      setActiveRunCanvas(canvas.name);
      mockApi.startRun(canvas.id).catch(() => setCanvasStates((states) => ({ ...states, [canvas.name]: "error" })));
    });
    setBottomOpen(true);
  };

  return (
    <>
      <WindowFrame
        className={`lab-window ${surface === "canvas" && inspectorOpen ? "" : "hide-inspector"} ${settingsState.compactSidebar ? "compact-sidebar" : ""} ${settingsState.reduceMotion ? "reduce-motion" : ""}`}
        title={surface === "canvas" ? workspaceName : surface[0].toUpperCase() + surface.slice(1)}
        subtitle={surface === "canvas" ? "Saved" : workspaceName}
        toolbar={
          <Toolbar>
            {surface === "canvas" ? <Tooltip content="Toggle inspector"><IconButton label="Toggle inspector" active={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)}><PanelRight /></IconButton></Tooltip> : null}
          </Toolbar>
        }
        sidebar={<WorkspaceNavigation activeSurface={surface} onNavigate={navigate} workspaceName={workspaceName} workspaceNames={workspaceNames} canvasName={canvasName} canvasNames={canvasNames} nodes={nodes} canvasStates={canvasStates} workspacesOpen={workspacesOpen} recentOpen={recentOpen} onToggleWorkspaces={() => setWorkspacesOpen(!workspacesOpen)} onToggleRecent={() => setRecentOpen(!recentOpen)} onNewWorkspace={openNewWorkspace} onAddCanvas={createCanvas} onSelectCanvas={selectCanvas} onRename={startRename} onDelete={setDeleteTarget} onSetPrimary={setPrimaryNode} />}
        inspector={surface === "canvas" && inspectorOpen ? <NodeInspector nodeName={nodes[1]?.name ?? nodes[0]?.name ?? "No node selected"} /> : undefined}
        bottomPanel={surface === "canvas" && bottomOpen ? <RunPanel /> : undefined}
      >
        {surface === "canvas" ? <CanvasPreview
          workspaceName={workspaceName}
          canvasTitle={canvasName}
          canvasStarted={canvasStarted}
          scopeEnabled={composerScopeEnabled}
          onWorkspaceChange={setWorkspaceName}
          onScopeClear={() => setComposerScopeEnabled(false)}
          onScopeEnable={() => setComposerScopeEnabled(true)}
          onStart={() => setCanvasStarted(true)}
          onNewWorkspace={openNewWorkspace}
          nodeLibraryOpen={nodeLibraryOpen}
          onToggleNodeLibrary={() => setNodeLibraryOpen(!nodeLibraryOpen)}
          onCloseNodeLibrary={() => setNodeLibraryOpen(false)}
          runHistoryOpen={runHistoryOpen}
          onToggleRunHistory={() => setRunHistoryOpen(!runHistoryOpen)}
          onCloseRunHistory={() => setRunHistoryOpen(false)}
          nodes={nodes}
          onAddNode={addNode}
          canRun={nodes.some((node) => node.primary)}
          runState={canvasStates[canvasName] ?? "idle"}
          onRun={runCanvas}
          onToggleRunPanel={() => setBottomOpen(!bottomOpen)}
          runPanelOpen={bottomOpen}
          onAddCanvas={createCanvas}
        /> : null}
        {surface === "automations" ? <AutomationsPage automations={automations} onCreate={() => openAutomationDialog()} onEdit={openAutomationDialog} onToggle={(id, enabled) => setAutomations((items) => items.map((item) => item.id === id ? { ...item, enabled, nextRun: enabled ? "Tomorrow, 09:00" : "Paused" } : item))} onRun={(automation) => pushNotice({ title: "Automation started", message: `${automation.name} is running on ${automation.canvas}.`, tone: "info" })} onDelete={(id) => setAutomations((items) => items.filter((item) => item.id !== id))} /> : null}
        {surface === "extensions" ? <ExtensionsPage extensions={extensions} onToggle={(id, enabled) => setExtensions((items) => items.map((item) => item.id === id ? { ...item, enabled } : item))} onInstall={(id) => { setExtensions((items) => items.map((item) => item.id === id ? { ...item, installed: true, enabled: true } : item)); pushNotice({ title: "Extension installed", message: "The extension is ready for this workspace." }); }} onUpdate={(id) => { setExtensions((items) => items.map((item) => item.id === id ? { ...item, updateAvailable: false } : item)); pushNotice({ title: "Extension updated", message: "The latest extension manifest is installed." }); }} onUninstall={(id) => { setExtensions((items) => items.map((item) => item.id === id ? { ...item, installed: false, enabled: false } : item)); pushNotice({ title: "Extension uninstalled", message: "The extension was removed from this workspace." }); }} onNotice={(message) => pushNotice({ title: "Extension details", message, tone: "info", duration: 8000 })} /> : null}
        {surface === "settings" ? <SettingsPage section={settingsSection} onSectionChange={setSettingsSection} settings={settingsState} onChange={updateSetting} /> : null}
        {surface === "files" ? <FilesPage workspaceName={workspaceName} onNotice={(message) => pushNotice({ title: "Workspace files", message })} /> : null}
        {surface === "environments" ? <EnvironmentsPage onNotice={(message) => pushNotice({ title: "Environment updated", message })} /> : null}
        {surface === "agents" ? <AgentsPage onNotice={(message) => pushNotice({ title: "Agent updated", message })} /> : null}
      </WindowFrame>
      {appNotices.length ? <div className="notification-stack" aria-label="Notifications" aria-live="polite">
        {appNotices.map((notice) => <Notification key={notice.id} title={notice.title} icon={notice.tone === "info" ? <Bell /> : <CheckCircle2 />} time="now" duration={notice.duration} onDismiss={() => dismissNotice(notice.id)}>{notice.message}</Notification>)}
      </div> : null}
      <Dialog
        open={automationDialogOpen}
        title={editingAutomationId ? "Edit Automation" : "New Automation"}
        description="Schedule a published canvas entrypoint. This preview stores the configuration in mock state."
        onClose={() => setAutomationDialogOpen(false)}
        footer={<><Button onClick={() => setAutomationDialogOpen(false)}>Cancel</Button><Button variant="primary" disabled={!automationName.trim()} onClick={saveAutomation}>{editingAutomationId ? "Save Changes" : "Create Automation"}</Button></>}
      >
        <div className="automation-form">
          <TextField label="Name" autoFocus placeholder="Daily research brief" value={automationName} onChange={(event) => setAutomationName(event.target.value)} />
          <label className="surface-select"><span>Canvas</span><select value={automationCanvas} onChange={(event) => setAutomationCanvas(event.target.value)}>{canvasNames.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="surface-select"><span>Schedule</span><select value={automationSchedule} onChange={(event) => setAutomationSchedule(event.target.value)}><option>Every weekday at 09:00</option><option>Every day at 18:00</option><option>Every 6 hours</option><option>Every Friday at 17:30</option></select></label>
        </div>
      </Dialog>
      <Dialog
        open={newWorkspaceOpen}
        title="New Workspace"
        description="Choose a local folder. A workspace starts with one canvas."
        onClose={() => setNewWorkspaceOpen(false)}
        footer={<><Button onClick={() => setNewWorkspaceOpen(false)}>Cancel</Button><Button variant="primary" disabled={!draftWorkspaceName.trim() || !draftWorkspace} onClick={createWorkspace}>Create Workspace</Button></>}
      >
        <div className="new-workspace-form">
          <TextField label="Workspace name" autoFocus placeholder="Untitled Workspace" value={draftWorkspaceName} onChange={(event) => setDraftWorkspaceName(event.target.value)} />
          <SegmentedControl
            label="Local folder"
            value={draftWorkspace}
            onChange={setDraftWorkspace}
            options={[
              { value: "D:\\Documents\\Thesis", label: "Thesis folder" },
              { value: "D:\\Documents\\Research", label: "Research folder" },
            ]}
          />
        </div>
      </Dialog>
      <Dialog
        open={Boolean(renameTarget)}
        title={`Rename ${renameTarget?.kind ?? "item"}`}
        description="The new name will be applied to this workspace object."
        onClose={() => setRenameTarget(null)}
        footer={<><Button onClick={() => setRenameTarget(null)}>Cancel</Button><Button variant="primary" disabled={!renameValue.trim()} onClick={confirmRename}>Rename</Button></>}
      >
        <TextField label="Name" autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
      </Dialog>
      <Dialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.kind ?? "item"}?`}
        description={deleteTarget?.kind === "node" ? "This node is connected to other nodes. Its edges and dependent data will be removed." : deleteTarget?.kind === "canvas" ? "This canvas contains nodes and run history. The canvas-level data will be removed." : "This workspace contains canvases, files and execution context. The workspace boundary will be removed."}
        onClose={() => setDeleteTarget(null)}
        footer={<><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="primary" onClick={confirmDelete}>Delete</Button></>}
      >
        <div className="delete-warning"><TriangleAlert /><span><strong>{deleteTarget?.name}</strong><small>This action cannot be undone in the current workspace.</small></span></div>
      </Dialog>
    </>
  );
}

interface WorkspaceNavigationProps {
  activeSurface: WorkbenchSurface;
  onNavigate: (surface: WorkbenchSurface) => void;
  workspaceName: string;
  workspaceNames: string[];
  canvasName: string;
  canvasNames: string[];
  nodes: NodeSummary[];
  canvasStates: Record<string, CanvasRuntimeState>;
  workspacesOpen: boolean;
  recentOpen: boolean;
  onToggleWorkspaces: () => void;
  onToggleRecent: () => void;
  onNewWorkspace: () => void;
  onAddCanvas: () => void;
  onSelectCanvas: (canvasName: string) => void;
  onRename: (kind: ManagedKind, name: string, id?: string) => void;
  onDelete: (target: ManagedTarget) => void;
  onSetPrimary: (nodeId: string) => void;
}

function WorkspaceNavigation({ activeSurface, onNavigate, workspaceName, workspaceNames, canvasName, canvasNames, nodes, canvasStates, workspacesOpen, recentOpen, onToggleWorkspaces, onToggleRecent, onNewWorkspace, onAddCanvas, onSelectCanvas, onRename, onDelete, onSetPrimary }: WorkspaceNavigationProps) {
  const [currentWorkspaceOpen, setCurrentWorkspaceOpen] = useState(true);
  const [currentCanvasOpen, setCurrentCanvasOpen] = useState(true);
  const [otherWorkspaceOpen, setOtherWorkspaceOpen] = useState<Record<string, boolean>>({});
  const currentCanvases = Array.from(new Set(canvasNames));
  const otherWorkspaces = workspaceNames.filter((name) => name !== workspaceName);
  const currentWorkspaceState = aggregateCanvasState(currentCanvases.map((name) => canvasStates[name] ?? "idle"));

  return (
    <div className="sidebar-shell">
      <nav className="sidebar-global" aria-label="Global actions">
        <SidebarItem icon={<FolderPlus />} onClick={onNewWorkspace}>New Workspace</SidebarItem>
        <SidebarItem icon={<CalendarClock />} active={activeSurface === "automations"} onClick={() => onNavigate("automations")}>Automations</SidebarItem>
        <SidebarItem icon={<Box />} active={activeSurface === "extensions"} onClick={() => onNavigate("extensions")}>Extensions</SidebarItem>
      </nav>
      <div className="sidebar-scroll">
        <SidebarDisclosure label="Workspaces" open={workspacesOpen} onToggle={onToggleWorkspaces}>
          <WorkspaceRow
            name={workspaceName}
            open={currentWorkspaceOpen}
            onToggle={() => setCurrentWorkspaceOpen(!currentWorkspaceOpen)}
            onAddCanvas={onAddCanvas}
            onRename={() => onRename("workspace", workspaceName)}
            onDelete={() => onDelete({ kind: "workspace", name: workspaceName })}
            state={currentWorkspaceState}
            current
          >
            {currentCanvases.map((name, index) => <CanvasRow key={`${name}-${index}`} name={name} state={canvasStates[name] ?? "idle"} active={name === canvasName} open={name === canvasName && currentCanvasOpen} onSelect={() => onSelectCanvas(name)} onToggle={() => { if (name !== canvasName) onSelectCanvas(name); setCurrentCanvasOpen(name === canvasName ? !currentCanvasOpen : true); }} onRename={() => onRename("canvas", name)} onDelete={() => onDelete({ kind: "canvas", name })} nodes={name === canvasName ? nodes : []} onNodeRename={(node) => onRename("node", node.name, node.id)} onNodeDelete={(node) => onDelete({ kind: "node", name: node.name, id: node.id })} onSetPrimary={onSetPrimary} />)}
            <button type="button" className="workspace-add-canvas" onClick={onAddCanvas}><Plus /><span>New Canvas</span></button>
            <div className="workspace-tools" aria-label={`${workspaceName} tools`}>
              <SidebarItem className="is-nested" icon={<Folder />} active={activeSurface === "files"} onClick={() => onNavigate("files")}>Files</SidebarItem>
              <SidebarItem className="is-nested" icon={<Settings />} active={activeSurface === "environments"} onClick={() => onNavigate("environments")}>Environments</SidebarItem>
              <SidebarItem className="is-nested" icon={<Bot />} active={activeSurface === "agents"} onClick={() => onNavigate("agents")}>Agents</SidebarItem>
            </div>
          </WorkspaceRow>
          {otherWorkspaces.map((name) => <WorkspaceRow key={name} name={name} state={name === "OpenMAIC" ? canvasStates["Java Course"] : aggregateCanvasState([canvasStates["Literature Survey"], canvasStates["Evaluation Plan"]])} open={Boolean(otherWorkspaceOpen[name])} onToggle={() => setOtherWorkspaceOpen((open) => ({ ...open, [name]: !open[name] }))} onRename={() => onRename("workspace", name)} onDelete={() => onDelete({ kind: "workspace", name })}>
            <SidebarItem className="is-nested" icon={<PanelsTopLeft />} trailing={<CanvasRuntimeIcon state={name === "OpenMAIC" ? canvasStates["Java Course"] : canvasStates["Literature Survey"]} />}>{name === "OpenMAIC" ? "Java Course" : "Literature Survey"}</SidebarItem>
            {name === "Research Workspace" ? <SidebarItem className="is-nested" icon={<PanelsTopLeft />} trailing={<CanvasRuntimeIcon state={canvasStates["Evaluation Plan"]} />}>Evaluation Plan</SidebarItem> : null}
          </WorkspaceRow>)}
        </SidebarDisclosure>
        <SidebarDisclosure label="Recent" open={recentOpen} onToggle={onToggleRecent}>
          <SidebarItem icon={<History />} onClick={() => onSelectCanvas("Evaluation Plan")}>Evaluation Plan</SidebarItem>
          <SidebarItem icon={<History />} onClick={() => onSelectCanvas("Citation Review")}>Citation Review</SidebarItem>
        </SidebarDisclosure>
      </div>
      <div className="sidebar-footer"><SidebarItem icon={<Settings />} active={activeSurface === "settings"} onClick={() => onNavigate("settings")}>Settings</SidebarItem></div>
    </div>
  );
}

interface WorkspaceRowProps {
  name: string;
  open: boolean;
  onToggle: () => void;
  onAddCanvas?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  state?: CanvasRuntimeState;
  current?: boolean;
  children: ReactNode;
}

function WorkspaceRow({ name, open, onToggle, onAddCanvas, onRename, onDelete, state = "idle", current = false, children }: WorkspaceRowProps) {
  return (
    <section className={`workspace-row ${open ? "is-open" : ""} ${current ? "is-current" : ""}`}>
      <div className="workspace-row__header">
        <button type="button" className="workspace-row__chevron" aria-label={`${open ? "Collapse" : "Expand"} ${name}`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button>
        <FolderOpen className="workspace-row__icon" aria-hidden="true" />
        <span className="workspace-row__name">{name}</span>
        <CanvasRuntimeIcon state={state} />
        {onRename || onDelete ? <span className="workspace-row__actions">{current ? <Tooltip content="New canvas"><IconButton label="New canvas" size="small" onClick={onAddCanvas}><Plus /></IconButton></Tooltip> : null}<ObjectActions label={`${name} actions`} onRename={onRename} onDelete={onDelete} /></span> : null}
      </div>
      {open ? <div className="workspace-row__children">{children}</div> : null}
    </section>
  );
}

function SidebarDisclosure({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className={`sidebar-disclosure ${open ? "is-open" : ""}`}><header><strong>{label}</strong><button type="button" aria-label={`${open ? "Collapse" : "Expand"} ${label}`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button></header>{open ? <div>{children}</div> : null}</section>;
}

function CanvasRow({ name, state, active, open, onSelect, onToggle, onRename, onDelete, nodes, onNodeRename, onNodeDelete, onSetPrimary }: { name: string; state: CanvasRuntimeState; active: boolean; open: boolean; onSelect: () => void; onToggle: () => void; onRename: () => void; onDelete: () => void; nodes: NodeSummary[]; onNodeRename: (node: NodeSummary) => void; onNodeDelete: (node: NodeSummary) => void; onSetPrimary: (nodeId: string) => void }) {
  return <div className={`canvas-row ${active ? "is-active" : ""} ${open ? "is-open" : ""}`}><div className="canvas-row__header"><button type="button" className="canvas-row__chevron" aria-label={`${open ? "Collapse" : "Expand"} ${name} nodes`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button><button type="button" className="canvas-row__select" onClick={onSelect}><PanelsTopLeft /><span>{name}</span></button><CanvasRuntimeIcon state={state} /><span className="canvas-row__actions"><ObjectActions label={`${name} actions`} onRename={onRename} onDelete={onDelete} /></span></div>{active && open ? <div className="node-preview-list">{nodes.map((node) => <NodePreviewRow key={node.id} node={node} onRename={() => onNodeRename(node)} onDelete={() => onNodeDelete(node)} onSetPrimary={() => onSetPrimary(node.id)} />)}</div> : null}</div>;
}

function CanvasRuntimeIcon({ state = "idle" }: { state?: CanvasRuntimeState }) {
  const Icon = state === "running" ? LoaderCircle : state === "success" ? CheckCircle2 : state === "waiting" ? Clock3 : state === "error" ? CircleAlert : CirclePlay;
  return <Icon className={`canvas-runtime-icon is-${state}`} aria-label={{ idle: "Ready", running: "Running", waiting: "Waiting", success: "Completed", error: "Failed" }[state]} />;
}

function NodePreviewRow({ node, onRename, onDelete, onSetPrimary }: { node: NodeSummary; onRename: () => void; onDelete: () => void; onSetPrimary: () => void }) {
  return <div className="node-preview-row"><Bot /><span>{node.name}</span>{node.primary ? <span className="node-preview-row__primary" title="Canvas entry node"><CirclePlay /></span> : <Tooltip content="Set as canvas entry node"><IconButton label={`Set ${node.name} as canvas entry node`} size="small" className="node-preview-row__set-primary" onClick={onSetPrimary}><CirclePlay /></IconButton></Tooltip>}<ObjectActions label={`${node.name} actions`} onRename={onRename} onDelete={onDelete} /></div>;
}

function ObjectActions({ label, onRename, onDelete }: { label: string; onRename?: () => void; onDelete?: () => void }) {
  return <Menu label={label} icon={<MoreHorizontal />} iconOnly items={[{ label: "Rename", icon: <Pencil />, onSelect: () => onRename?.() }, { label: "Delete", icon: <Trash2 />, separatorBefore: true, onSelect: () => onDelete?.() }]} />;
}

interface CanvasPreviewProps {
  workspaceName: string;
  canvasTitle: string;
  canvasStarted: boolean;
  scopeEnabled: boolean;
  onWorkspaceChange: (workspaceName: string) => void;
  onScopeClear: () => void;
  onScopeEnable: () => void;
  onStart: () => void;
  onNewWorkspace: () => void;
  nodeLibraryOpen: boolean;
  onToggleNodeLibrary: () => void;
  onCloseNodeLibrary: () => void;
  runHistoryOpen: boolean;
  onToggleRunHistory: () => void;
  onCloseRunHistory: () => void;
  nodes: NodeSummary[];
  onAddNode: (name: string) => void;
  canRun: boolean;
  runState: CanvasRuntimeState;
  onRun: () => void;
  onToggleRunPanel: () => void;
  runPanelOpen: boolean;
  onAddCanvas: () => void;
}

function CanvasPreview({ workspaceName, canvasTitle, canvasStarted, scopeEnabled, onWorkspaceChange, onScopeClear, onScopeEnable, onStart, onNewWorkspace, nodeLibraryOpen, onToggleNodeLibrary, onCloseNodeLibrary, runHistoryOpen, onToggleRunHistory, onCloseRunHistory, nodes, onAddNode, canRun, runState, onRun, onToggleRunPanel, runPanelOpen, onAddCanvas }: CanvasPreviewProps) {
  const [connectionSource, setConnectionSource] = useState<{ nodeId: string; portId: string; kind: "data" | "flow" | "event" | "resource" } | null>(null);
  const [zoom, setZoom] = useState(100);
  const addNode = (nodeName: string) => {
    onAddNode(nodeName);
    onCloseNodeLibrary();
  };
  const connectPort = (nodeId: string, portId: string, direction: "input" | "output", kind: "data" | "flow" | "event" | "resource") => {
    if (direction === "output") {
      setConnectionSource((source) => source?.nodeId === nodeId && source.portId === portId ? null : { nodeId, portId, kind });
      return;
    }
    if (connectionSource && connectionSource.nodeId !== nodeId && connectionSource.kind === kind) setConnectionSource(null);
  };
  const activePortKey = connectionSource ? `${connectionSource.nodeId}:${connectionSource.portId}` : null;

  return (
    <div className="canvas-preview">
      <div className="canvas-tabbar"><div className="canvas-tab is-active"><PanelsTopLeft /><span>{canvasTitle}</span></div><button type="button" aria-label="New canvas tab" title="New canvas tab" onClick={onAddCanvas}><Plus /></button></div>
      <div className="canvas-breadcrumb"><span>{workspaceName}</span><ChevronRight /><strong>{canvasTitle}</strong></div>
      <div className="canvas-actions" aria-label="Canvas actions">
        <Tooltip content="Add node" side="top"><IconButton label="Add node" active={nodeLibraryOpen} onClick={onToggleNodeLibrary}><Blocks /></IconButton></Tooltip>
        {canRun ? <Button variant="primary" size="small" leadingIcon={<Play />} onClick={onRun} disabled={runState === "running"}>{runState === "running" ? "Running" : "Run"}</Button> : null}
        <Tooltip content="Run history" side="top"><IconButton label="Run history" active={runHistoryOpen} onClick={onToggleRunHistory}><History /></IconButton></Tooltip>
        <Tooltip content="Toggle run output" side="top"><IconButton label="Toggle run output" active={runPanelOpen} onClick={onToggleRunPanel}><PanelBottom /></IconButton></Tooltip>
      </div>
      <svg className="canvas-edges" aria-hidden="true" viewBox="0 0 900 480" preserveAspectRatio="none">
        <path d="M263 158 C330 158 320 195 385 195" />
        <path d="M605 195 C670 195 650 250 718 250" />
      </svg>
      {nodes[0] ? <CanvasNode nodeId={nodes[0].id} className="node-one" title={nodes[0].name} typeLabel="Text input" icon={<Type />} primary={nodes[0].primary} state="success" activePortKey={activePortKey} acceptingConnectionKind={connectionSource?.nodeId !== nodes[0].id ? connectionSource?.kind : null} onPortConnect={(portId, direction, kind) => connectPort(nodes[0].id, portId, direction, kind)} outputs={[{ id: "text", label: "Topic", kind: "data", connectionCount: 3 }]} footer="128 chars" /> : null}
      {nodes[1] ? <CanvasNode nodeId={nodes[1].id} className="node-two" title={nodes[1].name} typeLabel="Agent task" icon={<Bot />} primary={nodes[1].primary} state="running" selected activePortKey={activePortKey} acceptingConnectionKind={connectionSource?.nodeId !== nodes[1].id ? connectionSource?.kind : null} onPortConnect={(portId, direction, kind) => connectPort(nodes[1].id, portId, direction, kind)} inputs={[{ id: "prompt", label: "Topic", kind: "data", connectionCount: 2 }, { id: "start", label: "Start", kind: "flow" }]} outputs={[{ id: "draft", label: "Draft", kind: "data", connectionCount: 4 }, { id: "outline", label: "Outline", kind: "data" }, { id: "sources", label: "Sources", kind: "resource" }, { id: "warnings", label: "Warnings", kind: "event" }, { id: "metrics", label: "Metrics", kind: "data" }, { id: "trace", label: "Execution trace", kind: "resource" }]} footer="Step 3 of 5" /> : null}
      {nodes[2] ? <CanvasNode nodeId={nodes[2].id} className="node-three" title={nodes[2].name} typeLabel="Human input" icon={<Pause />} primary={nodes[2].primary} state="waiting" activePortKey={activePortKey} acceptingConnectionKind={connectionSource?.nodeId !== nodes[2].id ? connectionSource?.kind : null} onPortConnect={(portId, direction, kind) => connectPort(nodes[2].id, portId, direction, kind)} inputs={[{ id: "draft", label: "Draft", kind: "data" }]} outputs={[{ id: "approved", label: "Approve", kind: "event" }]} footer="Action required" /> : null}
      {nodes.slice(3).map((node, index) => <AddedCanvasNode key={node.id} node={node} index={index} activePortKey={activePortKey} acceptingConnectionKind={connectionSource?.nodeId !== node.id ? connectionSource?.kind : null} onPortConnect={(portId, direction, kind) => connectPort(node.id, portId, direction, kind)} />)}
      {nodeLibraryOpen ? <NodeLibrary onAdd={addNode} onClose={onCloseNodeLibrary} /> : null}
      {runHistoryOpen ? <RunHistoryPanel onClose={onCloseRunHistory} /> : null}
      <AgentComposer
        workspaceName={workspaceName}
        draftMode={!canvasStarted}
        scopeEnabled={scopeEnabled}
        onWorkspaceChange={onWorkspaceChange}
        onScopeClear={onScopeClear}
        onScopeEnable={onScopeEnable}
        onNewWorkspace={onNewWorkspace}
        onSubmit={onStart}
      />
      <div className="canvas-zoom"><button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 10))}><Minus /></button><span>{zoom}%</span><button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => setZoom((value) => Math.min(200, value + 10))}><Plus /></button></div>
    </div>
  );
}

function SurfaceHeader({ eyebrow, title, description, icon, action }: { eyebrow: string; title: string; description: string; icon: ReactNode; action?: ReactNode }) {
  return <header className="surface-header"><div className="surface-header__icon">{icon}</div><div className="surface-header__copy"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action ? <div className="surface-header__action">{action}</div> : null}</header>;
}

function SurfaceSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="surface-section"><div className="surface-section__heading"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div></div>{children}</section>;
}

function AutomationsPage({ automations, onCreate, onEdit, onToggle, onRun, onDelete }: { automations: AutomationRecord[]; onCreate: () => void; onEdit: (automation: AutomationRecord) => void; onToggle: (id: string, enabled: boolean) => void; onRun: (automation: AutomationRecord) => void; onDelete: (id: string) => void }) {
  return <div className="surface-page">
    <SurfaceHeader eyebrow="Workspace automation" title="Automations" description="Schedule canvas entrypoints and keep recurring work visible." icon={<CalendarClock />} action={<Button variant="primary" leadingIcon={<Plus />} onClick={onCreate}>New Automation</Button>} />
    <div className="surface-metric-grid"><div><span>Active automations</span><strong>{automations.filter((item) => item.enabled).length}</strong></div><div><span>Next scheduled run</span><strong>{automations.find((item) => item.enabled)?.nextRun ?? "None"}</strong></div><div><span>Last 7 days</span><strong>18 runs</strong></div></div>
    <SurfaceSection title="Schedules" description="Changes apply to future runs. Existing runs keep their recorded configuration.">
      <div className="automation-list">{automations.map((automation) => <article className="automation-row" key={automation.id}><div className="automation-row__icon"><CalendarClock /></div><div className="automation-row__main"><div className="automation-row__title"><strong>{automation.name}</strong><StatusBadge tone={automation.enabled ? "success" : "neutral"} dot>{automation.enabled ? "Active" : "Paused"}</StatusBadge></div><span>{automation.canvas} · {automation.schedule}</span><small>Next: {automation.nextRun} · Last: {automation.lastRun}</small></div><div className="automation-row__controls"><Switch label="" aria-label={`${automation.enabled ? "Pause" : "Enable"} ${automation.name}`} checked={automation.enabled} onChange={(event) => onToggle(automation.id, event.target.checked)} /><Menu label={`${automation.name} actions`} icon={<MoreHorizontal />} iconOnly items={[{ label: "Run now", icon: <Play />, onSelect: () => onRun(automation) }, { label: "Edit", icon: <Pencil />, onSelect: () => onEdit(automation) }, { label: "Delete", icon: <Trash2 />, separatorBefore: true, onSelect: () => onDelete(automation.id) }]} /></div></article>)}{automations.length === 0 ? <EmptySurface icon={<CalendarClock />} title="No automations yet" description="Create a schedule to run a canvas without opening it." action={<Button variant="primary" onClick={onCreate}>Create Automation</Button>} /> : null}</div>
    </SurfaceSection>
  </div>;
}

function ExtensionsPage({ extensions, onToggle, onInstall, onUpdate, onUninstall, onNotice }: { extensions: ExtensionRecord[]; onToggle: (id: string, enabled: boolean) => void; onInstall: (id: string) => void; onUpdate: (id: string) => void; onUninstall: (id: string) => void; onNotice: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = extensions.filter((extension) => `${extension.name} ${extension.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="surface-page">
    <SurfaceHeader eyebrow="Workspace capabilities" title="Extensions" description="Connect approved capabilities to the active workspace." icon={<Box />} action={<div className="surface-search"><Search /><input aria-label="Search extensions" placeholder="Search extensions" value={query} onChange={(event) => setQuery(event.target.value)} /></div>} />
    <SurfaceSection title="Extension catalog" description="Installed extensions run within the workspace policy boundary.">
      <div className="extension-grid">{filtered.map((extension) => <article className={`extension-card ${extension.installed ? "is-installed" : ""}`} key={extension.id}><div className="extension-card__top"><div className="extension-card__icon">{extension.icon}</div><div className="extension-card__heading"><strong>{extension.name}</strong><span>{extension.publisher} · v{extension.version}</span></div>{extension.installed ? <StatusBadge tone={extension.enabled ? "success" : "neutral"} dot>{extension.enabled ? "Enabled" : "Disabled"}</StatusBadge> : null}</div><p>{extension.description}</p><div className="extension-card__footer">{extension.installed ? <><Switch label="" aria-label={`${extension.enabled ? "Disable" : "Enable"} ${extension.name}`} checked={extension.enabled} onChange={(event) => onToggle(extension.id, event.target.checked)} /><div className="extension-card__actions">{extension.updateAvailable ? <Button size="small" leadingIcon={<ArrowUpFromLine />} onClick={() => onUpdate(extension.id)}>Update</Button> : null}<Menu label={`${extension.name} actions`} icon={<MoreHorizontal />} iconOnly items={[{ label: "View permissions", icon: <ShieldCheck />, onSelect: () => onNotice(`${extension.name} requests workspace-scoped access only.`) }, { label: "Open documentation", icon: <ExternalLink />, onSelect: () => onNotice(`${extension.name} documentation opened in the preview.`) }, { label: "Uninstall", icon: <Trash2 />, separatorBefore: true, onSelect: () => onUninstall(extension.id) }]} /></div></> : <Button size="small" variant="primary" leadingIcon={<Plus />} onClick={() => onInstall(extension.id)}>Install</Button>}</div></article>)}{filtered.length === 0 ? <EmptySurface icon={<Search />} title="No matching extensions" description="Try a different search term." /> : null}</div>
    </SurfaceSection>
  </div>;
}

function SettingsPage({ section, onSectionChange, settings, onChange }: { section: string; onSectionChange: (section: string) => void; settings: SettingsState; onChange: (key: keyof SettingsState, value: boolean) => void }) {
  const sections = [{ id: "general", label: "General", icon: <SlidersHorizontal /> }, { id: "notifications", label: "Notifications", icon: <Bell /> }, { id: "execution", label: "Execution", icon: <Cpu /> }, { id: "privacy", label: "Privacy", icon: <ShieldCheck /> }];
  return <div className="settings-page"><SurfaceHeader eyebrow="Application preferences" title="Settings" description="Control how Seekwd looks, runs and reports work." icon={<Settings />} /><div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections">{sections.map((item) => <button type="button" className={section === item.id ? "is-active" : ""} key={item.id} onClick={() => onSectionChange(item.id)}>{item.icon}<span>{item.label}</span><ChevronRight /></button>)}</nav><div className="settings-content">{section === "general" ? <SurfaceSection title="General" description="Appearance and startup preferences."><Switch label="Compact sidebar" description="Use tighter navigation rows when you work with many canvases." checked={settings.compactSidebar} onChange={(event) => onChange("compactSidebar", event.target.checked)} /><Switch label="Reduce motion" description="Prefer immediate transitions and fewer animated indicators." checked={settings.reduceMotion} onChange={(event) => onChange("reduceMotion", event.target.checked)} /><Switch label="Reopen last workspace" description="Restore the most recent workspace on launch." checked={settings.reopenLastWorkspace} onChange={(event) => onChange("reopenLastWorkspace", event.target.checked)} /></SurfaceSection> : null}{section === "notifications" ? <SurfaceSection title="Notifications" description="Choose which events can interrupt your work."><Switch label="Successful runs" description="Show a notification when a canvas finishes successfully." checked={settings.notifySuccess} onChange={(event) => onChange("notifySuccess", event.target.checked)} /><Switch label="Failed runs" description="Show a notification when a run needs attention." checked={settings.notifyFailure} onChange={(event) => onChange("notifyFailure", event.target.checked)} /></SurfaceSection> : null}{section === "execution" ? <SurfaceSection title="Execution" description="Defaults for runs started from this application."><Switch label="Allow background runs" description="Keep approved runs active after the window is closed." checked={settings.allowBackgroundRuns} onChange={(event) => onChange("allowBackgroundRuns", event.target.checked)} /><Switch label="Confirm destructive actions" description="Ask before deleting workspaces, canvases or artifacts." checked={settings.confirmDestructive} onChange={(event) => onChange("confirmDestructive", event.target.checked)} /><div className="settings-callout"><ShieldCheck /><span><strong>Restricted local execution</strong><small>Read-only workspace access · network disabled · 10 minute limit</small></span><StatusBadge tone="success" dot>Default</StatusBadge></div></SurfaceSection> : null}{section === "privacy" ? <SurfaceSection title="Privacy" description="Data sharing stays disabled unless you explicitly enable it."><Switch label="Product telemetry" description="Share anonymous interaction data to improve the UI lab." checked={settings.telemetry} onChange={(event) => onChange("telemetry", event.target.checked)} /><div className="settings-callout"><KeyRound /><span><strong>Secrets stay local</strong><small>Credentials are referenced by ID and never included in canvas events.</small></span></div></SurfaceSection> : null}</div></div></div>;
}

function FilesPage({ workspaceName, onNotice }: { workspaceName: string; onNotice: (message: string) => void }) { return <div className="surface-page"><SurfaceHeader eyebrow="Workspace content" title="Files" description={`Browse artifacts and source files available to ${workspaceName}.`} icon={<Folder />} action={<Button leadingIcon={<ArrowUpFromLine />} onClick={() => onNotice("Import is ready for a local file.")}>Import</Button>} /><SurfaceSection title="Recent files" description="Files are scoped to this workspace."><div className="file-list">{["research-notes.md", "citation-review.json", "experiment-report.md", "sources.bib"].map((file, index) => <button type="button" key={file} onClick={() => onNotice(`${file} opened in preview.`)}><FileCode2 /><span><strong>{file}</strong><small>{index % 2 ? "Generated artifact" : "Workspace file"} · {index + 2} KB</small></span><ExternalLink /></button>)}</div></SurfaceSection></div>; }
function EnvironmentsPage({ onNotice }: { onNotice: (message: string) => void }) { const [selected, setSelected] = useState("LocalRestricted"); return <div className="surface-page"><SurfaceHeader eyebrow="Execution boundary" title="Environments" description="Choose where nodes execute and inspect the active safety limits." icon={<Cpu />} /><SurfaceSection title="Execution profiles" description="The preview only exposes restricted local execution."><div className="environment-list">{[{ id: "LocalRestricted", title: "Local Restricted", detail: "Read-only workspace · no network · cancellable", tone: "success" as const }, { id: "DockerSandbox", title: "Docker Sandbox", detail: "Unavailable until the host runtime is connected", tone: "neutral" as const }].map((item) => <button type="button" className={selected === item.id ? "is-selected" : ""} key={item.id} onClick={() => { setSelected(item.id); onNotice(`${item.title} selected.`); }}><div><strong>{item.title}</strong><span>{item.detail}</span></div><StatusBadge tone={item.tone} dot>{item.id === "LocalRestricted" ? "Active" : "Coming soon"}</StatusBadge></button>)}</div></SurfaceSection></div>; }
function AgentsPage({ onNotice }: { onNotice: (message: string) => void }) { const [enabled, setEnabled] = useState(true); return <div className="surface-page"><SurfaceHeader eyebrow="Delegated work" title="Agents" description="Manage the agents that can propose and execute structured work." icon={<Bot />} action={<Button leadingIcon={<UserRoundCog />} onClick={() => onNotice("Agent invite flow opened.")}>Add Agent</Button>} /><SurfaceSection title="Workspace agents" description="Agents inherit the workspace policy and cannot silently expand authority."><div className="agent-list"><div className="agent-row"><div className="agent-avatar"><Bot /></div><div><strong>Research Agent</strong><span>Drafts summaries and proposes graph patches</span><small>Last active 4 minutes ago · Restricted</small></div><Switch label="" aria-label="Enable Research Agent" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); onNotice(event.target.checked ? "Research Agent enabled." : "Research Agent paused."); }} /></div></div></SurfaceSection></div>; }

function EmptySurface({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) { return <div className="surface-empty"><div>{icon}</div><strong>{title}</strong><p>{description}</p>{action}</div>; }

function AddedCanvasNode({ node: nodeSummary, index, activePortKey, acceptingConnectionKind, onPortConnect }: { node: NodeSummary; index: number; activePortKey: string | null; acceptingConnectionKind: "data" | "flow" | "event" | "resource" | null | undefined; onPortConnect: (portId: string, direction: "input" | "output", kind: "data" | "flow" | "event" | "resource") => void }) {
  const node = nodeSummary.name === "Text Input"
    ? { typeLabel: "Text input", icon: <Type />, inputs: [], outputs: [{ id: "text", label: "Text", kind: "data" as const }] }
    : nodeSummary.name === "File Input"
      ? { typeLabel: "File input", icon: <FolderOpen />, inputs: [], outputs: [{ id: "file", label: "File", kind: "resource" as const }] }
      : nodeSummary.name === "Human Approval"
        ? { typeLabel: "Human input", icon: <Pause />, inputs: [{ id: "request", label: "Request", kind: "data" as const }], outputs: [{ id: "approved", label: "Approved", kind: "event" as const }] }
        : nodeSummary.name === "Event Trigger"
          ? { typeLabel: "Trigger", icon: <Zap />, inputs: [], outputs: [{ id: "event", label: "Event", kind: "event" as const }] }
          : { typeLabel: "Agent task", icon: <Bot />, inputs: [{ id: "goal", label: "Goal", kind: "data" as const }], outputs: [{ id: "result", label: "Result", kind: "data" as const }] };
  const position = { left: `${19 + (index % 3) * 22}%`, top: `${58 + Math.floor(index / 3) * 14}%` };
  return <CanvasNode nodeId={nodeSummary.id} className="node-added" style={position} title={nodeSummary.name} typeLabel={node.typeLabel} icon={node.icon} activePortKey={activePortKey} acceptingConnectionKind={acceptingConnectionKind} onPortConnect={onPortConnect} inputs={node.inputs} outputs={node.outputs} footer="Not configured" />;
}

function NodeLibrary({ onAdd, onClose }: { onAdd: (nodeName: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const nodes = [
    { name: "Text Input", category: "Input", description: "Provide text or instructions", icon: <Type /> },
    { name: "File Input", category: "Input", description: "Read a workspace artifact", icon: <FolderOpen /> },
    { name: "Agent Task", category: "Intelligence", description: "Delegate an objective to an agent", icon: <Bot /> },
    { name: "Human Approval", category: "Control", description: "Pause for a human decision", icon: <Pause /> },
    { name: "Event Trigger", category: "Control", description: "Continue when an event occurs", icon: <Zap /> },
  ].filter((node) => `${node.name} ${node.category}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <aside className="node-library" aria-label="Node Library">
      <header><span><Blocks /><strong>Node Library</strong></span><IconButton label="Close node library" size="small" onClick={onClose}><X /></IconButton></header>
      <div className="node-library__search"><TextField aria-label="Search nodes" leadingIcon={<Search />} placeholder="Search nodes" value={query} onChange={(event) => setQuery(event.target.value)} clearable /></div>
      <div className="node-library__list">
        {nodes.map((node) => <button type="button" key={node.name} draggable onClick={() => onAdd(node.name)}><span className="node-library__icon">{node.icon}</span><span><strong>{node.name}</strong><small>{node.description}</small></span><Plus aria-hidden="true" /></button>)}
        {nodes.length === 0 ? <p>No matching nodes</p> : null}
      </div>
    </aside>
  );
}

interface AgentComposerProps {
  workspaceName: string;
  draftMode: boolean;
  scopeEnabled: boolean;
  onWorkspaceChange: (workspaceName: string) => void;
  onScopeClear: () => void;
  onScopeEnable: () => void;
  onNewWorkspace: () => void;
  onSubmit: () => void;
}

function AgentComposer({ workspaceName, draftMode, scopeEnabled, onWorkspaceChange, onScopeClear, onScopeEnable, onNewWorkspace, onSubmit }: AgentComposerProps) {
  const [value, setValue] = useState("");
  const [composerMaxHeight, setComposerMaxHeight] = useState(() => getComposerMaxHeight());
  const [textareaHeight, setTextareaHeight] = useState(32);
  const [textareaOverflow, setTextareaOverflow] = useState<"hidden" | "auto">("hidden");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const workspaces = ["Thesis Workspace", "Research Workspace", "OpenMAIC"];
  const visibleWorkspaces = workspaces.filter((workspace) => workspace.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const updateMaxHeight = () => setComposerMaxHeight(getComposerMaxHeight());
    window.addEventListener("resize", updateMaxHeight);
    window.visualViewport?.addEventListener("resize", updateMaxHeight);
    return () => {
      window.removeEventListener("resize", updateMaxHeight);
      window.visualViewport?.removeEventListener("resize", updateMaxHeight);
    };
  }, []);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const contentHeight = textarea.scrollHeight;
    const nextHeight = Math.min(composerMaxHeight, Math.max(32, contentHeight));
    textarea.style.height = `${nextHeight}px`;
    setTextareaHeight(nextHeight);
    setTextareaOverflow(contentHeight > composerMaxHeight ? "auto" : "hidden");
  }, [value, composerMaxHeight]);

  const submit = () => {
    if (!value.trim()) return;
    setValue("");
    setScopePickerOpen(false);
    onSubmit();
  };

  const selectWorkspace = (workspace: string) => {
    onWorkspaceChange(workspace);
    onScopeEnable();
    setScopePickerOpen(false);
    setQuery("");
  };

  return (
    <section className="agent-composer" aria-label="Agent conversation">
      {draftMode ? (
        <div className="agent-composer__scope-row">
          {scopeEnabled ? (
            <div className="agent-composer__scope">
              <button type="button" className="agent-composer__scope-trigger" onClick={() => setScopePickerOpen(!scopePickerOpen)} aria-expanded={scopePickerOpen}>
                <FolderOpen /><span>{workspaceName}</span>
              </button>
              <IconButton label="Remove workspace scope" size="small" className="agent-composer__scope-remove" onClick={() => { onScopeClear(); setScopePickerOpen(false); }}><X /></IconButton>
            </div>
          ) : <button type="button" className="agent-composer__scope-empty" onClick={() => setScopePickerOpen(!scopePickerOpen)} aria-expanded={scopePickerOpen}><FolderPlus /><span>Choose workspace</span></button>}
          {scopePickerOpen ? (
            <div className="agent-composer__scope-picker" role="dialog" aria-label="Choose workspace">
              <TextField aria-label="Search workspaces" leadingIcon={<Search />} placeholder="Search workspaces" value={query} onChange={(event) => setQuery(event.target.value)} />
              <div className="agent-composer__scope-list">
                {visibleWorkspaces.map((workspace) => <button type="button" key={workspace} className={workspace === workspaceName ? "is-selected" : ""} onClick={() => selectWorkspace(workspace)}><Folder /><span>{workspace}</span></button>)}
              </div>
              <button type="button" className="agent-composer__new-workspace" onClick={() => { setScopePickerOpen(false); onNewWorkspace(); }}><FolderPlus /><span>New Workspace</span></button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="agent-composer__surface">
        <textarea
          ref={textareaRef}
          aria-label="Message the agent"
          placeholder={draftMode ? "Describe what to build" : "Request a change or ask about this canvas"}
          value={value}
          style={{ height: `${textareaHeight}px`, maxHeight: `${composerMaxHeight}px`, overflowY: textareaOverflow }}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />
        <footer>
          <Tooltip content="Attach context"><IconButton label="Attach context" size="small"><Paperclip /></IconButton></Tooltip>
          <span className="agent-composer__spacer" />
          <Tooltip content="Send request"><IconButton label="Send request" active={Boolean(value.trim())} onClick={submit}><ArrowUp /></IconButton></Tooltip>
        </footer>
      </div>
    </section>
  );
}

function getComposerMaxHeight() {
  if (typeof window === "undefined") return 240;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  return Math.max(96, Math.min(320, Math.floor(viewportHeight * 0.42)));
}

function RunHistoryPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="run-history" aria-label="Run history">
      <header className="run-history__header">
        <div><History /><span><strong>Run History</strong><small>Experiment Report</small></span></div>
        <IconButton label="Close run history" size="small" onClick={onClose}><X /></IconButton>
      </header>
      <div className="run-history__session"><GitFork /><span><strong>Workspace session</strong><small>Cross-canvas execution</small></span><StatusBadge tone="info">Active</StatusBadge></div>
      <div className="run-history__list">
        <RunHistoryItem icon={<Clock3 />} title="Run 003" detail="Draft Experiment Report" status="Running" tone="info" />
        <RunHistoryItem icon={<CheckCircle2 />} title="Run 002" detail="Research Topic → Draft" status="Completed" tone="success" />
        <RunHistoryItem icon={<TriangleAlert />} title="Run 001" detail="Waiting for source input" status="Failed" tone="danger" />
      </div>
      <footer className="run-history__footer"><span>Runs are scoped to this canvas.</span><button type="button">Open workspace session</button></footer>
    </aside>
  );
}

function RunHistoryItem({ icon, title, detail, status, tone }: { icon: ReactNode; title: string; detail: string; status: string; tone: "info" | "success" | "danger" }) {
  return <button type="button" className="run-history__item"><span className={`run-history__item-icon is-${tone}`}>{icon}</span><span className="run-history__item-copy"><strong>{title}</strong><small>{detail}</small></span><StatusBadge tone={tone}>{status}</StatusBadge></button>;
}

function NodeInspector({ nodeName }: { nodeName: string }) {
  return (
    <>
      <PanelHeader title="Inspector" trailing={<IconButton label="Inspector actions" size="small"><MoreHorizontal /></IconButton>} />
      <div className="inspector-summary"><span className="summary-icon"><Bot /></span><span><strong>{nodeName}</strong><small>Agent task</small></span></div>
      <InspectorSection title="General">
        <PropertyRow label="Name"><TextField value={nodeName} readOnly aria-label="Node name" /></PropertyRow>
        <PropertyRow label="Description" vertical><TextField defaultValue="Draft a structured experiment report from the topic and source material." aria-label="Node description" /></PropertyRow>
      </InspectorSection>
      <InspectorSection title="Execution">
        <PropertyRow label="Agent"><span className="value-select">Pong Agent <ChevronRight /></span></PropertyRow>
        <PropertyRow label="Mode"><span className="value-select">Collaborative <ChevronRight /></span></PropertyRow>
        <Switch label="Repair on failure" description="Allow the Agent to submit repair proposals" defaultChecked />
      </InspectorSection>
      <InspectorSection title="Ports">
        <div className="port-row"><ArrowDownToLine className="port-icon data" aria-hidden="true" /><span>Topic</span><code>string</code></div>
        <div className="port-row"><Zap className="port-icon flow" aria-hidden="true" /><span>Start</span><code>flow</code></div>
        <div className="port-row"><ArrowUpFromLine className="port-icon output" aria-hidden="true" /><span>Draft</span><code>artifact</code></div>
      </InspectorSection>
    </>
  );
}

function RunPanel() {
  return (
    <div className="run-panel">
      <PanelHeader title="Run output" trailing={<Toolbar><StatusBadge tone="info" dot>Running</StatusBadge><IconButton label="Pause run" size="small"><Pause /></IconButton><IconButton label="Run actions" size="small"><MoreHorizontal /></IconButton></Toolbar>} />
      <div className="run-content">
        <div className="run-tabs"><button className="is-active">Events</button><button>Logs</button><button>Issues <span>0</span></button></div>
        <div className="run-events">
          <p><time>19:24:03</time><StatusBadge tone="success" dot aria-label="Completed" /><span>Completed: Research Topic</span><small>12 ms</small></p>
          <p><time>19:24:04</time><StatusBadge tone="info" dot aria-label="Running" /><span>Running: Draft Experiment Report</span><small>18.4 s</small></p>
          <p><time>19:24:22</time><StatusBadge tone="warning" dot aria-label="Waiting" /><span>Waiting for report structure review</span></p>
        </div>
      </div>
    </div>
  );
}

function ComponentGallery() {
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const appIcon = <span className="swift-app-mark">Seek<br />wd</span>;
  return (
    <WindowFrame className="gallery-window" title="Seekwd UI">
      <main className="gallery">
        <div className="gallery-row"><span>Button</span><div className="gallery-row__controls"><Button>Button</Button><Button variant="primary">Button</Button></div></div>
        <div className="gallery-row is-tall"><span>Input</span><div className="gallery-row__controls is-stacked"><TextField id="node-name" placeholder="WebSwift" clearable /><TextField id="search" leadingIcon={<Search />} placeholder="WebSwift" clearable /></div></div>
        <div className="gallery-row"><span>Switch</span><Switch label="" aria-label="Switch" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /></div>
        <div className="gallery-row is-menu"><span>Menu</span><Menu label="Menu" inline items={[1, 2, 3, 4, 5].map((number) => ({ label: `Menu ${number}`, onSelect: () => undefined }))} /></div>
        <div className="gallery-row"><span>Checkbox</span><Checkbox label="Checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /></div>
        <div className="gallery-row"><span>Messagebox</span><Button variant="primary" onClick={() => setDialogOpen(true)}>Show</Button></div>
        <div className="gallery-row"><span>Notification</span><Button variant="primary" onClick={() => setNoticeVisible(!noticeVisible)}>Show</Button></div>
        <div className="gallery-row"><span>Progress</span><div className="gallery-row__controls is-stacked is-progress"><Progress value={25} /><Progress value={75} compact /></div></div>
        {noticeVisible ? <Notification title="Seekwd" icon={appIcon} time="now" onDismiss={() => setNoticeVisible(false)}>Canvas saved to the current workspace.</Notification> : null}
        <MessageBox open={dialogOpen} title="Messagebox" icon={appIcon} actionLabel="OK" onClose={() => setDialogOpen(false)}>This message box is part of the Seekwd UI foundation.</MessageBox>
      </main>
    </WindowFrame>
  );
}
