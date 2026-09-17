import { useState } from "react";
import {
  ArrowUp,
  Bot,
  Box,
  ChevronRight,
  CirclePlay,
  ArrowDownToLine,
  ArrowUpFromLine,
  Blocks,
  CalendarClock,
  Folder,
  FolderOpen,
  FolderPlus,
  Gauge,
  LibraryBig,
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
  SquarePen,
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
  SidebarGroup,
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
  const [bottomOpen, setBottomOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("Thesis Workspace");
  const [projectName, setProjectName] = useState("Experiment Report");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [draftProjectName, setDraftProjectName] = useState("");
  const [draftWorkspace, setDraftWorkspace] = useState("");
  const [projectStarted, setProjectStarted] = useState(false);
  const [composerScopeEnabled, setComposerScopeEnabled] = useState(true);
  const [nodeLibraryOpen, setNodeLibraryOpen] = useState(false);

  const createProject = () => {
    const nextName = draftProjectName.trim();
    if (!nextName || !draftWorkspace) return;
    setWorkspaceName(draftWorkspace);
    setProjectName(nextName);
    setDraftProjectName("");
    setProjectStarted(false);
    setComposerScopeEnabled(true);
    setNewProjectOpen(false);
  };

  const openNewProject = () => {
    setDraftProjectName("");
    setDraftWorkspace("");
    setNewProjectOpen(true);
  };

  return (
    <>
      <WindowFrame
        className={`lab-window ${inspectorOpen ? "" : "hide-inspector"}`}
        title={workspaceName}
        subtitle="Saved"
        toolbar={
          <Toolbar>
            <Tooltip content="Add node"><IconButton label="Add node" active={nodeLibraryOpen} onClick={() => setNodeLibraryOpen(!nodeLibraryOpen)}><Blocks /></IconButton></Tooltip>
            <Button variant="primary" size="small" leadingIcon={<Play />}>Run</Button>
            <ToolbarDivider />
            <Tooltip content="Toggle run panel"><IconButton label="Toggle run panel" active={bottomOpen} onClick={() => setBottomOpen(!bottomOpen)}><PanelBottom /></IconButton></Tooltip>
            <Tooltip content="Toggle inspector"><IconButton label="Toggle inspector" active={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)}><PanelRight /></IconButton></Tooltip>
          </Toolbar>
        }
        sidebar={<WorkspaceNavigation workspaceName={workspaceName} projectName={projectName} nodeLibraryOpen={nodeLibraryOpen} onNewProject={openNewProject} onOpenRuns={() => setBottomOpen(true)} onToggleNodeLibrary={() => setNodeLibraryOpen(!nodeLibraryOpen)} />}
        inspector={inspectorOpen ? <NodeInspector /> : undefined}
        bottomPanel={bottomOpen ? <RunPanel /> : undefined}
      >
        <CanvasPreview
          workspaceName={workspaceName}
          canvasTitle={projectName}
          projectStarted={projectStarted}
          scopeEnabled={composerScopeEnabled}
          onWorkspaceChange={setWorkspaceName}
          onScopeClear={() => setComposerScopeEnabled(false)}
          onScopeEnable={() => setComposerScopeEnabled(true)}
          onStart={() => setProjectStarted(true)}
          onNewProject={openNewProject}
          nodeLibraryOpen={nodeLibraryOpen}
          onCloseNodeLibrary={() => setNodeLibraryOpen(false)}
        />
      </WindowFrame>
      <Dialog
        open={newProjectOpen}
        title="New Project"
        description="Choose a workspace. A project starts with a default canvas."
        onClose={() => setNewProjectOpen(false)}
        footer={<><Button onClick={() => setNewProjectOpen(false)}>Cancel</Button><Button variant="primary" disabled={!draftProjectName.trim() || !draftWorkspace} onClick={createProject}>Create Project</Button></>}
      >
        <div className="new-project-form">
          <TextField label="Project name" autoFocus placeholder="Untitled Project" value={draftProjectName} onChange={(event) => setDraftProjectName(event.target.value)} />
          <SegmentedControl
            label="Workspace"
            value={draftWorkspace}
            onChange={setDraftWorkspace}
            options={[
              { value: "Thesis Workspace", label: "Thesis Workspace" },
              { value: "Research Workspace", label: "Research Workspace" },
            ]}
          />
        </div>
      </Dialog>
    </>
  );
}

interface WorkspaceNavigationProps {
  workspaceName: string;
  projectName: string;
  nodeLibraryOpen: boolean;
  onNewProject: () => void;
  onOpenRuns: () => void;
  onToggleNodeLibrary: () => void;
}

function WorkspaceNavigation({ workspaceName, projectName, nodeLibraryOpen, onNewProject, onOpenRuns, onToggleNodeLibrary }: WorkspaceNavigationProps) {
  const workspacePath = workspaceName === "Thesis Workspace" ? "D:\\Documents\\Thesis" : workspaceName === "Research Workspace" ? "D:\\Documents\\Research" : "D:\\bs\\seekwd\\OpenMAIC";
  return (
    <>
      <nav className="sidebar-global" aria-label="Global">
        <SidebarItem icon={<SquarePen />} onClick={onNewProject}>New Project</SidebarItem>
        <SidebarItem icon={<CirclePlay />} trailing="1" onClick={onOpenRuns}>Runs</SidebarItem>
        <SidebarItem icon={<CalendarClock />}>Automations</SidebarItem>
        <SidebarItem icon={<Box />}>Extensions</SidebarItem>
      </nav>
      <div className="workspace-title">
        <span className="workspace-title__copy">
          <span className="workspace-title__name"><FolderOpen /><strong>{workspaceName}</strong></span>
          <small>{workspacePath}</small>
        </span>
        <IconButton label="New project" size="small" onClick={onNewProject}><Plus /></IconButton>
      </div>
      <SidebarSection label="Workspace">
        <SidebarGroup icon={<LibraryBig />} trailing="3" label="Canvases" defaultOpen>
          <SidebarItem className="is-nested" icon={<PanelsTopLeft />} active>{projectName}</SidebarItem>
          <SidebarItem className="is-nested" icon={<PanelsTopLeft />}>Source Analysis</SidebarItem>
          <SidebarItem className="is-nested" icon={<PanelsTopLeft />}>Citation Review</SidebarItem>
        </SidebarGroup>
        <SidebarItem icon={<Blocks />} trailing="24" className={nodeLibraryOpen ? "is-context-open" : ""} onClick={onToggleNodeLibrary}>Node Library</SidebarItem>
        <SidebarItem icon={<Folder />} trailing="12">Files</SidebarItem>
      </SidebarSection>
      <SidebarSection label="Resources">
        <SidebarItem icon={<Gauge />}>Environments</SidebarItem>
        <SidebarItem icon={<Bot />}>Agents</SidebarItem>
      </SidebarSection>
      <div className="sidebar-footer"><SidebarItem icon={<Settings />}>Settings</SidebarItem></div>
    </>
  );
}

interface CanvasPreviewProps {
  workspaceName: string;
  canvasTitle: string;
  projectStarted: boolean;
  scopeEnabled: boolean;
  onWorkspaceChange: (workspaceName: string) => void;
  onScopeClear: () => void;
  onScopeEnable: () => void;
  onStart: () => void;
  onNewProject: () => void;
  nodeLibraryOpen: boolean;
  onCloseNodeLibrary: () => void;
}

function CanvasPreview({ workspaceName, canvasTitle, projectStarted, scopeEnabled, onWorkspaceChange, onScopeClear, onScopeEnable, onStart, onNewProject, nodeLibraryOpen, onCloseNodeLibrary }: CanvasPreviewProps) {
  const [addedNodes, setAddedNodes] = useState<string[]>([]);
  const addNode = (nodeName: string) => {
    setAddedNodes((nodes) => [...nodes, nodeName]);
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
      <CanvasNode className="node-one" title="Research Topic" typeLabel="Text input" icon={<Type />} state="success" outputs={[{ id: "text", label: "Topic", kind: "data" }]} footer="128 chars" />
      <CanvasNode className="node-two" title="Draft Experiment Report" typeLabel="Agent task" icon={<Bot />} state="running" selected inputs={[{ id: "prompt", label: "Topic", kind: "data" }, { id: "start", label: "Start", kind: "flow" }]} outputs={[{ id: "draft", label: "Draft", kind: "data" }]} footer="Step 3 of 5" />
      <CanvasNode className="node-three" title="Review Report Structure" typeLabel="Human input" icon={<Pause />} state="waiting" inputs={[{ id: "draft", label: "Draft", kind: "data" }]} outputs={[{ id: "approved", label: "Approve", kind: "event" }]} footer="Action required" />
      {addedNodes.map((nodeName, index) => <AddedCanvasNode key={`${nodeName}-${index}`} name={nodeName} index={index} />)}
      {nodeLibraryOpen ? <NodeLibrary onAdd={addNode} onClose={onCloseNodeLibrary} /> : null}
      <AgentComposer
        workspaceName={workspaceName}
        draftMode={!projectStarted}
        scopeEnabled={scopeEnabled}
        onWorkspaceChange={onWorkspaceChange}
        onScopeClear={onScopeClear}
        onScopeEnable={onScopeEnable}
        onNewProject={onNewProject}
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
  onNewProject: () => void;
  onSubmit: () => void;
}

function AgentComposer({ workspaceName, draftMode, scopeEnabled, onWorkspaceChange, onScopeClear, onScopeEnable, onNewProject, onSubmit }: AgentComposerProps) {
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
              <button type="button" className="agent-composer__new-project" onClick={() => { setScopePickerOpen(false); onNewProject(); }}><FolderPlus /><span>New Project</span></button>
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

function NodeInspector() {
  return (
    <>
      <PanelHeader title="Inspector" trailing={<IconButton label="Inspector actions" size="small"><MoreHorizontal /></IconButton>} />
      <div className="inspector-summary"><span className="summary-icon"><Bot /></span><span><strong>Draft Experiment Report</strong><small>Agent task</small></span></div>
      <InspectorSection title="General">
        <PropertyRow label="Name"><TextField defaultValue="Draft Experiment Report" aria-label="Node name" /></PropertyRow>
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
