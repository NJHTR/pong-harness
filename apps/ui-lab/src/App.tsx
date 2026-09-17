import { useState } from "react";
import {
  Bot,
  Box,
  Braces,
  ChevronRight,
  CirclePlay,
  FileOutput,
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
      title="论文写作"
      subtitle="已保存"
      toolbar={
        <Toolbar>
          <Tooltip content="添加节点"><IconButton label="添加节点"><Plus /></IconButton></Tooltip>
          <Button variant="primary" size="small" leadingIcon={<Play />}>运行</Button>
          <ToolbarDivider />
          <Tooltip content="切换运行面板"><IconButton label="切换运行面板" active={bottomOpen} onClick={() => setBottomOpen(!bottomOpen)}><PanelBottom /></IconButton></Tooltip>
          <Tooltip content="切换检查器"><IconButton label="切换检查器" active={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)}><PanelRight /></IconButton></Tooltip>
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
      <div className="workspace-title"><FolderOpen /><span><strong>论文工作区</strong><small>D:\Documents\Thesis</small></span><IconButton label="工作区操作" size="small"><MoreHorizontal /></IconButton></div>
      <SidebarSection label="工作区">
        <SidebarItem icon={<Workflow />} active trailing="3">画布</SidebarItem>
        <SidebarItem icon={<CirclePlay />} trailing="1">运行</SidebarItem>
        <SidebarItem icon={<Folder />} trailing="12">文件</SidebarItem>
      </SidebarSection>
      <SidebarSection label="资源">
        <SidebarItem icon={<Gauge />}>环境</SidebarItem>
        <SidebarItem icon={<Box />}>扩展</SidebarItem>
        <SidebarItem icon={<Bot />}>Agents</SidebarItem>
      </SidebarSection>
      <SidebarSection label="画布">
        <SidebarItem icon={<ChevronRight />} active>实验报告生成</SidebarItem>
        <SidebarItem icon={<ChevronRight />}>资料分析</SidebarItem>
        <SidebarItem icon={<ChevronRight />}>引用检查</SidebarItem>
      </SidebarSection>
      <div className="sidebar-footer"><SidebarItem icon={<Settings />}>设置</SidebarItem></div>
    </>
  );
}

function CanvasPreview() {
  return (
    <div className="canvas-preview">
      <div className="canvas-tabbar"><div className="canvas-tab is-active"><Workflow /><span>实验报告生成</span><i /></div><button aria-label="新建标签页"><Plus /></button></div>
      <div className="canvas-breadcrumb"><span>论文工作区</span><ChevronRight /><strong>实验报告生成</strong></div>
      <svg className="canvas-edges" aria-hidden="true" viewBox="0 0 900 480" preserveAspectRatio="none">
        <path d="M263 158 C330 158 320 195 385 195" />
        <path d="M605 195 C670 195 650 250 718 250" />
      </svg>
      <CanvasNode className="node-one" title="研究主题" typeLabel="文字输入" icon={<Type />} state="success" outputs={[{ id: "text", label: "主题", kind: "data" }]} footer="128 字" />
      <CanvasNode className="node-two" title="撰写实验报告" typeLabel="Agent 任务" icon={<Bot />} state="running" selected inputs={[{ id: "prompt", label: "主题", kind: "data" }, { id: "start", label: "开始", kind: "flow" }]} outputs={[{ id: "draft", label: "草稿", kind: "data" }]} footer="步骤 3 / 5" />
      <CanvasNode className="node-three" title="确认报告结构" typeLabel="人工输入" icon={<Pause />} state="waiting" inputs={[{ id: "draft", label: "草稿", kind: "data" }]} outputs={[{ id: "approved", label: "确认", kind: "event" }]} footer="需要操作" />
      <div className="canvas-zoom"><button>−</button><span>100%</span><button>+</button></div>
    </div>
  );
}

function NodeInspector() {
  return (
    <>
      <PanelHeader title="检查器" trailing={<IconButton label="检查器操作" size="small"><MoreHorizontal /></IconButton>} />
      <div className="inspector-summary"><span className="summary-icon"><Bot /></span><span><strong>撰写实验报告</strong><small>Agent 任务</small></span></div>
      <InspectorSection title="常规">
        <PropertyRow label="名称"><TextField defaultValue="撰写实验报告" aria-label="节点名称" /></PropertyRow>
        <PropertyRow label="说明" vertical><TextField defaultValue="根据输入主题和资料撰写结构化实验报告" aria-label="节点说明" /></PropertyRow>
      </InspectorSection>
      <InspectorSection title="执行">
        <PropertyRow label="Agent"><span className="value-select">Pong Agent <ChevronRight /></span></PropertyRow>
        <PropertyRow label="模式"><span className="value-select">协同执行 <ChevronRight /></span></PropertyRow>
        <Switch label="失败时自动修复" description="允许 Agent 提交修复建议" defaultChecked />
      </InspectorSection>
      <InspectorSection title="端口">
        <div className="port-row"><i className="port data" /><span>主题</span><code>string</code></div>
        <div className="port-row"><i className="port flow" /><span>开始</span><code>flow</code></div>
        <div className="port-row"><i className="port data" /><span>草稿</span><code>artifact</code></div>
      </InspectorSection>
    </>
  );
}

function RunPanel() {
  return (
    <div className="run-panel">
      <PanelHeader title="运行输出" trailing={<Toolbar><StatusBadge tone="info" dot>运行中</StatusBadge><IconButton label="暂停运行" size="small"><Pause /></IconButton><IconButton label="运行操作" size="small"><MoreHorizontal /></IconButton></Toolbar>} />
      <div className="run-content">
        <div className="run-tabs"><button className="is-active">事件</button><button>日志</button><button>问题 <span>0</span></button></div>
        <div className="run-events">
          <p><time>19:24:03</time><i className="success" /><span>完成：研究主题</span><small>12 ms</small></p>
          <p><time>19:24:04</time><i className="running" /><span>正在执行：撰写实验报告</span><small>18.4 s</small></p>
          <p><time>19:24:22</time><i className="waiting" /><span>下一步需要确认报告结构</span></p>
        </div>
      </div>
    </div>
  );
}

function ComponentGallery() {
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState("edit");
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
        <div className="gallery-row"><span>Progress</span><div className="gallery-row__controls is-stacked"><Progress value={25} /><Progress value={75} compact /></div></div>
        <div className="gallery-subheading">Seekwd extensions</div>
        <div className="gallery-row"><span>Toolbar</span><div className="gallery-row__controls"><IconButton label="Add node"><Plus /></IconButton><SegmentedControl label="Canvas mode" value={mode} onChange={setMode} options={[{ value: "edit", label: "Edit" }, { value: "run", label: "Run" }, { value: "debug", label: "Debug" }]} /><Button variant="primary" leadingIcon={<Play />}>Run</Button></div></div>
        <div className="gallery-row"><span>Run status</span><div className="gallery-row__controls"><StatusBadge tone="info" dot>Running</StatusBadge><StatusBadge tone="success" dot>Complete</StatusBadge><StatusBadge tone="warning" dot>Waiting</StatusBadge><StatusBadge tone="danger" dot>Failed</StatusBadge></div></div>
        <div className="gallery-node-row"><CanvasNode title="Read sources" typeLabel="File input" icon={<FolderOpen />} state="success" outputs={[{ id: "file", label: "File", kind: "data" }]} /><CanvasNode title="Extract structure" typeLabel="Code task" icon={<Braces />} state="running" selected inputs={[{ id: "file", label: "File", kind: "data" }]} outputs={[{ id: "data", label: "Structure", kind: "data" }]} /><CanvasNode title="Review content" typeLabel="Human input" icon={<Pause />} state="waiting" inputs={[{ id: "draft", label: "Draft", kind: "data" }]} outputs={[{ id: "next", label: "Continue", kind: "event" }]} /><CanvasNode title="Export document" typeLabel="File output" icon={<FileOutput />} state="error" inputs={[{ id: "content", label: "Content", kind: "data" }]} /></div>
        {noticeVisible ? <Notification title="Seekwd" icon={appIcon} time="now" onDismiss={() => setNoticeVisible(false)}>Canvas saved to the current workspace.</Notification> : null}
        <MessageBox open={dialogOpen} title="Messagebox" icon={appIcon} actionLabel="OK" onClose={() => setDialogOpen(false)}>This message box is part of the Seekwd UI foundation.</MessageBox>
      </main>
    </WindowFrame>
  );
}
