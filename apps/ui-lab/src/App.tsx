import { useState, type ReactNode } from "react";
import {
  ArrowUp,
  Bot,
  Box,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Blocks,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Folder,
  FolderOpen,
  FolderPlus,
  GitFork,
  History,
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
  Settings,
  Pencil,
  Trash2,
  TriangleAlert,
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

type Theme = "dark" | "light";
type LabView = "workbench" | "components";
type ManagedKind = "workspace" | "canvas" | "node";
interface ManagedTarget { kind: ManagedKind; id?: string; name: string }
interface NodeSummary { id: string; name: string }

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
  const [bottomOpen, setBottomOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("Thesis Workspace");
  const [workspaceNames, setWorkspaceNames] = useState(["Thesis Workspace", "Research Workspace", "OpenMAIC"]);
  const [canvasName, setCanvasName] = useState("Experiment Report");
  const [canvasNames, setCanvasNames] = useState(["Experiment Report", "Source Analysis", "Citation Review"]);
  const [nodes, setNodes] = useState<NodeSummary[]>([
    { id: "research-topic", name: "Research Topic" },
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

  const createWorkspace = () => {
    const nextName = draftWorkspaceName.trim();
    if (!nextName || !draftWorkspace) return;
    setWorkspaceName(nextName);
    setWorkspaceNames((names) => names.includes(nextName) ? names : [...names, nextName]);
    setCanvasName("Untitled Canvas");
    setCanvasNames(["Untitled Canvas"]);
    setNodes([]);
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
    setCanvasStarted(false);
    setComposerScopeEnabled(true);
  };

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

  return (
    <>
      <WindowFrame
        className={`lab-window ${inspectorOpen ? "" : "hide-inspector"}`}
        title={workspaceName}
        subtitle="Saved"
        toolbar={
          <Toolbar>
            <Tooltip content="Add node"><IconButton label="Add node" active={nodeLibraryOpen} onClick={() => setNodeLibraryOpen(!nodeLibraryOpen)}><Blocks /></IconButton></Tooltip>
            <Button variant="primary" size="small" leadingIcon={<Play />} onClick={() => setBottomOpen(true)}>Run</Button>
            <Tooltip content="Run history"><IconButton label="Run history" active={runHistoryOpen} onClick={() => setRunHistoryOpen(!runHistoryOpen)}><History /></IconButton></Tooltip>
            <ToolbarDivider />
            <Tooltip content="Toggle run panel"><IconButton label="Toggle run panel" active={bottomOpen} onClick={() => setBottomOpen(!bottomOpen)}><PanelBottom /></IconButton></Tooltip>
            <Tooltip content="Toggle inspector"><IconButton label="Toggle inspector" active={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)}><PanelRight /></IconButton></Tooltip>
          </Toolbar>
        }
        sidebar={<WorkspaceNavigation workspaceName={workspaceName} workspaceNames={workspaceNames} canvasName={canvasName} canvasNames={canvasNames} nodes={nodes} workspacesOpen={workspacesOpen} recentOpen={recentOpen} onToggleWorkspaces={() => setWorkspacesOpen(!workspacesOpen)} onToggleRecent={() => setRecentOpen(!recentOpen)} onNewWorkspace={openNewWorkspace} onAddCanvas={createCanvas} onSelectCanvas={setCanvasName} onRename={startRename} onDelete={setDeleteTarget} />}
        inspector={inspectorOpen ? <NodeInspector nodeName={nodes[1]?.name ?? nodes[0]?.name ?? "No node selected"} /> : undefined}
        bottomPanel={bottomOpen ? <RunPanel /> : undefined}
      >
        <CanvasPreview
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
          onCloseNodeLibrary={() => setNodeLibraryOpen(false)}
          runHistoryOpen={runHistoryOpen}
          onCloseRunHistory={() => setRunHistoryOpen(false)}
          nodes={nodes}
          onAddNode={addNode}
        />
      </WindowFrame>
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
  workspaceName: string;
  workspaceNames: string[];
  canvasName: string;
  canvasNames: string[];
  nodes: NodeSummary[];
  workspacesOpen: boolean;
  recentOpen: boolean;
  onToggleWorkspaces: () => void;
  onToggleRecent: () => void;
  onNewWorkspace: () => void;
  onAddCanvas: () => void;
  onSelectCanvas: (canvasName: string) => void;
  onRename: (kind: ManagedKind, name: string, id?: string) => void;
  onDelete: (target: ManagedTarget) => void;
}

function WorkspaceNavigation({ workspaceName, workspaceNames, canvasName, canvasNames, nodes, workspacesOpen, recentOpen, onToggleWorkspaces, onToggleRecent, onNewWorkspace, onAddCanvas, onSelectCanvas, onRename, onDelete }: WorkspaceNavigationProps) {
  const [currentWorkspaceOpen, setCurrentWorkspaceOpen] = useState(true);
  const [currentCanvasOpen, setCurrentCanvasOpen] = useState(true);
  const [otherWorkspaceOpen, setOtherWorkspaceOpen] = useState<Record<string, boolean>>({});
  const currentCanvases = Array.from(new Set(canvasNames));
  const otherWorkspaces = workspaceNames.filter((name) => name !== workspaceName);

  return (
    <>
      <nav className="sidebar-global" aria-label="Global actions">
        <SidebarItem icon={<FolderPlus />} onClick={onNewWorkspace}>New Workspace</SidebarItem>
        <SidebarItem icon={<CalendarClock />}>Automations</SidebarItem>
        <SidebarItem icon={<Box />}>Extensions</SidebarItem>
      </nav>
      <SidebarDisclosure label="Workspaces" open={workspacesOpen} onToggle={onToggleWorkspaces}>
        <WorkspaceRow
          name={workspaceName}
          open={currentWorkspaceOpen}
          onToggle={() => setCurrentWorkspaceOpen(!currentWorkspaceOpen)}
          onAddCanvas={onAddCanvas}
          onRename={() => onRename("workspace", workspaceName)}
          onDelete={() => onDelete({ kind: "workspace", name: workspaceName })}
          current
        >
          {currentCanvases.map((name, index) => <CanvasRow key={`${name}-${index}`} name={name} active={name === canvasName} open={name === canvasName && currentCanvasOpen} onSelect={() => onSelectCanvas(name)} onToggle={() => { if (name !== canvasName) onSelectCanvas(name); setCurrentCanvasOpen(name === canvasName ? !currentCanvasOpen : true); }} onRename={() => onRename("canvas", name)} onDelete={() => onDelete({ kind: "canvas", name })} nodes={name === canvasName ? nodes : []} onNodeRename={(node) => onRename("node", node.name, node.id)} onNodeDelete={(node) => onDelete({ kind: "node", name: node.name, id: node.id })} />)}
          <button type="button" className="workspace-add-canvas" onClick={onAddCanvas}><Plus /><span>New Canvas</span></button>
          <div className="workspace-tools" aria-label={`${workspaceName} tools`}>
            <SidebarItem className="is-nested" icon={<Folder />}>Files</SidebarItem>
            <SidebarItem className="is-nested" icon={<Settings />}>Environments</SidebarItem>
            <SidebarItem className="is-nested" icon={<Bot />}>Agents</SidebarItem>
          </div>
        </WorkspaceRow>
        {otherWorkspaces.map((name) => <WorkspaceRow key={name} name={name} open={Boolean(otherWorkspaceOpen[name])} onToggle={() => setOtherWorkspaceOpen((open) => ({ ...open, [name]: !open[name] }))} onRename={() => onRename("workspace", name)} onDelete={() => onDelete({ kind: "workspace", name })}>
          <SidebarItem className="is-nested" icon={<PanelsTopLeft />}>{name === "OpenMAIC" ? "Java Course" : "Literature Survey"}</SidebarItem>
          {name === "Research Workspace" ? <SidebarItem className="is-nested" icon={<PanelsTopLeft />}>Evaluation Plan</SidebarItem> : null}
        </WorkspaceRow>)}
      </SidebarDisclosure>
      <SidebarDisclosure label="Recent" open={recentOpen} onToggle={onToggleRecent}>
        <SidebarItem icon={<History />}>Evaluation Plan</SidebarItem>
        <SidebarItem icon={<History />}>Citation Review</SidebarItem>
      </SidebarDisclosure>
      <div className="sidebar-footer"><SidebarItem icon={<Settings />}>Settings</SidebarItem></div>
    </>
  );
}

interface WorkspaceRowProps {
  name: string;
  open: boolean;
  onToggle: () => void;
  onAddCanvas?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  current?: boolean;
  children: ReactNode;
}

function WorkspaceRow({ name, open, onToggle, onAddCanvas, onRename, onDelete, current = false, children }: WorkspaceRowProps) {
  return (
    <section className={`workspace-row ${open ? "is-open" : ""} ${current ? "is-current" : ""}`}>
      <div className="workspace-row__header">
        <button type="button" className="workspace-row__chevron" aria-label={`${open ? "Collapse" : "Expand"} ${name}`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button>
        <FolderOpen className="workspace-row__icon" aria-hidden="true" />
        <span className="workspace-row__name">{name}</span>
        {onRename || onDelete ? <span className="workspace-row__actions">{current ? <Tooltip content="New canvas"><IconButton label="New canvas" size="small" onClick={onAddCanvas}><Plus /></IconButton></Tooltip> : null}<ObjectActions label={`${name} actions`} onRename={onRename} onDelete={onDelete} /></span> : null}
      </div>
      {open ? <div className="workspace-row__children">{children}</div> : null}
    </section>
  );
}

function SidebarDisclosure({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className={`sidebar-disclosure ${open ? "is-open" : ""}`}><header><strong>{label}</strong><button type="button" aria-label={`${open ? "Collapse" : "Expand"} ${label}`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button></header>{open ? <div>{children}</div> : null}</section>;
}

function CanvasRow({ name, active, open, onSelect, onToggle, onRename, onDelete, nodes, onNodeRename, onNodeDelete }: { name: string; active: boolean; open: boolean; onSelect: () => void; onToggle: () => void; onRename: () => void; onDelete: () => void; nodes: NodeSummary[]; onNodeRename: (node: NodeSummary) => void; onNodeDelete: (node: NodeSummary) => void }) {
  return <div className={`canvas-row ${active ? "is-active" : ""} ${open ? "is-open" : ""}`}><div className="canvas-row__header"><button type="button" className="canvas-row__chevron" aria-label={`${open ? "Collapse" : "Expand"} ${name} nodes`} aria-expanded={open} onClick={onToggle}><ChevronRight /></button><button type="button" className="canvas-row__select" onClick={onSelect}><PanelsTopLeft /><span>{name}</span></button><span className="canvas-row__actions"><ObjectActions label={`${name} actions`} onRename={onRename} onDelete={onDelete} /></span></div>{active && open ? <div className="node-preview-list">{nodes.map((node) => <NodePreviewRow key={node.id} name={node.name} onRename={() => onNodeRename(node)} onDelete={() => onNodeDelete(node)} />)}</div> : null}</div>;
}

function NodePreviewRow({ name, onRename, onDelete }: { name: string; onRename: () => void; onDelete: () => void }) {
  return <div className="node-preview-row"><Bot /><span>{name}</span><ObjectActions label={`${name} actions`} onRename={onRename} onDelete={onDelete} /></div>;
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
  onCloseNodeLibrary: () => void;
  runHistoryOpen: boolean;
  onCloseRunHistory: () => void;
  nodes: NodeSummary[];
  onAddNode: (name: string) => void;
}

function CanvasPreview({ workspaceName, canvasTitle, canvasStarted, scopeEnabled, onWorkspaceChange, onScopeClear, onScopeEnable, onStart, onNewWorkspace, nodeLibraryOpen, onCloseNodeLibrary, runHistoryOpen, onCloseRunHistory, nodes, onAddNode }: CanvasPreviewProps) {
  const addNode = (nodeName: string) => {
    onAddNode(nodeName);
    onCloseNodeLibrary();
  };

  return (
    <div className="canvas-preview">
      <div className="canvas-tabbar"><div className="canvas-tab is-active"><PanelsTopLeft /><span>{canvasTitle}</span></div><button aria-label="New canvas tab" title="New canvas tab"><Plus /></button></div>
      <div className="canvas-breadcrumb"><span>{workspaceName}</span><ChevronRight /><strong>{canvasTitle}</strong></div>
      <svg className="canvas-edges" aria-hidden="true" viewBox="0 0 900 480" preserveAspectRatio="none">
        <path d="M263 158 C330 158 320 195 385 195" />
        <path d="M605 195 C670 195 650 250 718 250" />
      </svg>
      {nodes[0] ? <CanvasNode className="node-one" title={nodes[0].name} typeLabel="Text input" icon={<Type />} state="success" outputs={[{ id: "text", label: "Topic", kind: "data" }]} footer="128 chars" /> : null}
      {nodes[1] ? <CanvasNode className="node-two" title={nodes[1].name} typeLabel="Agent task" icon={<Bot />} state="running" selected inputs={[{ id: "prompt", label: "Topic", kind: "data" }, { id: "start", label: "Start", kind: "flow" }]} outputs={[{ id: "draft", label: "Draft", kind: "data" }]} footer="Step 3 of 5" /> : null}
      {nodes[2] ? <CanvasNode className="node-three" title={nodes[2].name} typeLabel="Human input" icon={<Pause />} state="waiting" inputs={[{ id: "draft", label: "Draft", kind: "data" }]} outputs={[{ id: "approved", label: "Approve", kind: "event" }]} footer="Action required" /> : null}
      {nodes.slice(3).map((node, index) => <AddedCanvasNode key={node.id} name={node.name} index={index} />)}
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
      <div className="canvas-zoom"><button aria-label="Zoom out" title="Zoom out"><Minus /></button><span>100%</span><button aria-label="Zoom in" title="Zoom in"><Plus /></button></div>
    </div>
  );
}

function AddedCanvasNode({ name, index }: { name: string; index: number }) {
  const node = name === "Text Input"
    ? { typeLabel: "Text input", icon: <Type />, inputs: [], outputs: [{ id: "text", label: "Text", kind: "data" as const }] }
    : name === "File Input"
      ? { typeLabel: "File input", icon: <FolderOpen />, inputs: [], outputs: [{ id: "file", label: "File", kind: "resource" as const }] }
      : name === "Human Approval"
        ? { typeLabel: "Human input", icon: <Pause />, inputs: [{ id: "request", label: "Request", kind: "data" as const }], outputs: [{ id: "approved", label: "Approved", kind: "event" as const }] }
        : name === "Event Trigger"
          ? { typeLabel: "Trigger", icon: <Zap />, inputs: [], outputs: [{ id: "event", label: "Event", kind: "event" as const }] }
          : { typeLabel: "Agent task", icon: <Bot />, inputs: [{ id: "goal", label: "Goal", kind: "data" as const }], outputs: [{ id: "result", label: "Result", kind: "data" as const }] };
  const position = { left: `${19 + (index % 3) * 22}%`, top: `${58 + Math.floor(index / 3) * 14}%` };
  return <CanvasNode className="node-added" style={position} title={name} typeLabel={node.typeLabel} icon={node.icon} inputs={node.inputs} outputs={node.outputs} footer="Not configured" />;
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
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const workspaces = ["Thesis Workspace", "Research Workspace", "OpenMAIC"];
  const visibleWorkspaces = workspaces.filter((workspace) => workspace.toLowerCase().includes(query.toLowerCase()));

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
          aria-label="Message the agent"
          placeholder={draftMode ? "Describe what to build" : "Request a change or ask about this canvas"}
          value={value}
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
