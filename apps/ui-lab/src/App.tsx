import { useState } from "react";
import {
  Bot,
  Box,
  ChevronRight,
  CirclePlay,
  Folder,
  FolderOpen,
  Gauge,
  Moon,
  MoreHorizontal,
  PanelBottom,
  PanelRight,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Sun,
  Type,
  Workflow,
} from "lucide-react";
import {
  Button,
  CanvasNode,
  Checkbox,
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

  return (
    <WindowFrame
      className={`lab-window ${inspectorOpen ? "" : "hide-inspector"}`}
      title="Thesis Workspace"
      subtitle="Saved"
      toolbar={
        <Toolbar>
          <Tooltip content="Add node"><IconButton label="Add node"><Plus /></IconButton></Tooltip>
          <Button variant="primary" size="small" leadingIcon={<Play />}>Run</Button>
          <ToolbarDivider />
          <Tooltip content="Toggle run panel"><IconButton label="Toggle run panel" active={bottomOpen} onClick={() => setBottomOpen(!bottomOpen)}><PanelBottom /></IconButton></Tooltip>
          <Tooltip content="Toggle inspector"><IconButton label="Toggle inspector" active={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)}><PanelRight /></IconButton></Tooltip>
        </Toolbar>
      }
      sidebar={<WorkspaceNavigation />}
      inspector={inspectorOpen ? <NodeInspector /> : undefined}
      bottomPanel={bottomOpen ? <RunPanel /> : undefined}
    >
      <CanvasPreview />
    </WindowFrame>
  );
}

function WorkspaceNavigation() {
  return (
    <>
      <div className="workspace-title"><FolderOpen /><span><strong>Thesis Workspace</strong><small>D:\Documents\Thesis</small></span><IconButton label="Workspace actions" size="small"><MoreHorizontal /></IconButton></div>
      <SidebarSection label="Workspace">
        <SidebarItem icon={<Workflow />} active trailing="3">Canvases</SidebarItem>
        <SidebarItem icon={<CirclePlay />} trailing="1">Runs</SidebarItem>
        <SidebarItem icon={<Folder />} trailing="12">Files</SidebarItem>
      </SidebarSection>
      <SidebarSection label="Resources">
        <SidebarItem icon={<Gauge />}>Environments</SidebarItem>
        <SidebarItem icon={<Box />}>Extensions</SidebarItem>
        <SidebarItem icon={<Bot />}>Agents</SidebarItem>
      </SidebarSection>
      <SidebarSection label="Canvases">
        <SidebarItem icon={<ChevronRight />} active>Experiment Report</SidebarItem>
        <SidebarItem icon={<ChevronRight />}>Source Analysis</SidebarItem>
        <SidebarItem icon={<ChevronRight />}>Citation Review</SidebarItem>
      </SidebarSection>
      <div className="sidebar-footer"><SidebarItem icon={<Settings />}>Settings</SidebarItem></div>
    </>
  );
}

function CanvasPreview() {
  return (
    <div className="canvas-preview">
      <div className="canvas-tabbar"><div className="canvas-tab is-active"><Workflow /><span>Experiment Report</span><i /></div><button aria-label="New canvas tab"><Plus /></button></div>
      <div className="canvas-breadcrumb"><span>Thesis Workspace</span><ChevronRight /><strong>Experiment Report</strong></div>
      <svg className="canvas-edges" aria-hidden="true" viewBox="0 0 900 480" preserveAspectRatio="none">
        <path d="M263 158 C330 158 320 195 385 195" />
        <path d="M605 195 C670 195 650 250 718 250" />
      </svg>
      <CanvasNode className="node-one" title="Research Topic" typeLabel="Text input" icon={<Type />} state="success" outputs={[{ id: "text", label: "Topic", kind: "data" }]} footer="128 chars" />
      <CanvasNode className="node-two" title="Draft Experiment Report" typeLabel="Agent task" icon={<Bot />} state="running" selected inputs={[{ id: "prompt", label: "Topic", kind: "data" }, { id: "start", label: "Start", kind: "flow" }]} outputs={[{ id: "draft", label: "Draft", kind: "data" }]} footer="Step 3 of 5" />
      <CanvasNode className="node-three" title="Review Report Structure" typeLabel="Human input" icon={<Pause />} state="waiting" inputs={[{ id: "draft", label: "Draft", kind: "data" }]} outputs={[{ id: "approved", label: "Approve", kind: "event" }]} footer="Action required" />
      <div className="canvas-zoom"><button>−</button><span>100%</span><button>+</button></div>
    </div>
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
        <div className="port-row"><i className="port data" /><span>Topic</span><code>string</code></div>
        <div className="port-row"><i className="port flow" /><span>Start</span><code>flow</code></div>
        <div className="port-row"><i className="port data" /><span>Draft</span><code>artifact</code></div>
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
          <p><time>19:24:03</time><i className="success" /><span>Completed: Research Topic</span><small>12 ms</small></p>
          <p><time>19:24:04</time><i className="running" /><span>Running: Draft Experiment Report</span><small>18.4 s</small></p>
          <p><time>19:24:22</time><i className="waiting" /><span>Waiting for report structure review</span></p>
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
