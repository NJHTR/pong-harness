import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, ChevronDown, ChevronRight, CircleCheck, CirclePlay, Folder, FolderPlus, GitBranch, Pencil, Play, Plus, Save, Sparkles } from "lucide-react";
import { createHttpHostClient, createLocalHostClient } from "@seekwd/client";
import type { Canvas, HostSnapshot, Workspace } from "@seekwd/protocol-schema";
import "@seekwd/ui/styles.css";
import "./workbench.css";

const client = import.meta.env.VITE_HOST_URL
  ? createHttpHostClient(import.meta.env.VITE_HOST_URL)
  : createLocalHostClient();

function App() {
  const [snapshot, setSnapshot] = useState<HostSnapshot>({ workspaces: [], canvases: [], nodes: [], revisions: [], runs: [], notifications: [] });
  const [workspaceId, setWorkspaceId] = useState<string>();
  const [canvasId, setCanvasId] = useState<string>();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string>();
  const activeWorkspace = snapshot.workspaces.find((item) => item.id === workspaceId) ?? snapshot.workspaces[0];
  const activeCanvas = snapshot.canvases.find((item) => item.id === canvasId) ?? snapshot.canvases.find((item) => item.workspaceId === activeWorkspace?.id);
  const currentRun = activeCanvas ? snapshot.runs.find((run) => run.canvasId === activeCanvas.id && run.status === "running") : undefined;
  const latestRevision = activeCanvas ? snapshot.revisions.filter((revision) => revision.canvasId === activeCanvas.id).sort((a, b) => b.revision - a.revision)[0] : undefined;
  const activeEntrypointNode = activeCanvas?.defaultEntrypointNodeId
    ? snapshot.nodes.find((node) => node.id === activeCanvas.defaultEntrypointNodeId)
    : undefined;

  useEffect(() => { client.snapshot().then(setSnapshot); return client.subscribe(setSnapshot); }, []);
  useEffect(() => { if (activeWorkspace && !workspaceId) setWorkspaceId(activeWorkspace.id); if (activeCanvas && !canvasId) setCanvasId(activeCanvas.id); }, [activeWorkspace, activeCanvas, workspaceId, canvasId]);
  useEffect(() => { const item = snapshot.notifications[0]; if (!item) return; setNotice(item.message); const timer = window.setTimeout(() => setNotice(undefined), 5000); return () => window.clearTimeout(timer); }, [snapshot.notifications]);

  const canvasesForWorkspace = useMemo(() => activeWorkspace ? snapshot.canvases.filter((item) => item.workspaceId === activeWorkspace.id) : [], [snapshot.canvases, activeWorkspace]);
  const run = async () => { if (!activeCanvas || currentRun) return; try { await client.startRun({ canvasId: activeCanvas.id, revision: activeCanvas.revision, entrypoint: "default", idempotencyKey: crypto.randomUUID() }); } catch (error) { setNotice(error instanceof Error ? `${error.name}: ${error.message}` : "Unable to start run"); } };
  const createWorkspace = async () => { try { const item = await client.createWorkspace({ name: "New Workspace", path: "D:/Documents/New Workspace" }); setWorkspaceId(item.id); setExpanded((state) => ({ ...state, [item.id]: true })); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to create workspace"); } };
  const createCanvas = async () => { if (!activeWorkspace) return; try { const item = await client.createCanvas({ workspaceId: activeWorkspace.id, name: "Untitled Canvas" }); setCanvasId(item.id); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to create canvas"); } };
  const renameCanvas = async () => { if (!activeCanvas) return; const name = window.prompt("Canvas name", activeCanvas.name); if (!name) return; try { await client.renameCanvas(activeCanvas.id, name); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to rename canvas"); } };
  const saveRevision = async () => { if (!activeCanvas) return; try { const revision = await client.saveRevision(activeCanvas.id); setNotice(`Revision ${revision.revision} saved`); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save revision"); } };
  const configureEntrypoint = async () => { if (!activeCanvas || !activeEntrypointNode) return; try { await client.setDefaultEntrypoint(activeCanvas.id, activeEntrypointNode.id); setNotice("Default entrypoint configured"); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to configure entrypoint"); } };

  return <main className="workbench" data-sk-theme="light">
    <aside className="navigation">
      <header className="nav-header"><div className="brand-mark"><Sparkles size={16} /></div><div><strong>Seekwd</strong><span>Workbench</span></div><button aria-label="Notifications"><Bell size={16} /></button></header>
      <div className="nav-actions"><button onClick={createWorkspace}><FolderPlus size={15} />New workspace</button><button onClick={createCanvas} disabled={!activeWorkspace}><Plus size={15} />New canvas</button></div>
      <section className="tree-section"><div className="tree-title"><span>WORKSPACES</span><button onClick={() => setExpanded({})}>Collapse all</button></div>
        {snapshot.workspaces.map((workspace) => <WorkspaceRow key={workspace.id} workspace={workspace} open={expanded[workspace.id] ?? true} selected={workspace.id === activeWorkspace?.id} onToggle={() => setExpanded((state) => ({ ...state, [workspace.id]: !state[workspace.id] }))} onSelect={() => { setWorkspaceId(workspace.id); setCanvasId(undefined); }} canvases={snapshot.canvases.filter((canvas) => canvas.workspaceId === workspace.id)} canvasId={canvasId} onCanvasSelect={setCanvasId} />)}
      </section>
      <footer className="nav-footer"><div><span className="status-dot" />Local host connected</div><span className="version">v0.1 vertical slice</span></footer>
    </aside>
    <section className="surface">
      <header className="surface-header"><div><span className="eyebrow">{activeWorkspace?.name ?? "Workspace"}</span><h1>{activeCanvas?.name ?? "Select a canvas"}</h1><p>{activeCanvas ? `Revision ${activeCanvas.revision} · ${activeCanvas.status}` : "Create a canvas to begin"}</p></div><div className="header-actions"><button className="quiet-button" onClick={renameCanvas} disabled={!activeCanvas}><Pencil size={15} />Rename</button><button className="quiet-button" onClick={saveRevision} disabled={!activeCanvas}><Save size={15} />Save revision</button>{activeCanvas && !activeCanvas.defaultEntrypointNodeId && activeEntrypointNode ? <button className="quiet-button" onClick={configureEntrypoint}><CirclePlay size={15} />Set start</button> : null}<button className="run-button" onClick={run} disabled={!activeCanvas || !activeCanvas.defaultEntrypointNodeId || Boolean(currentRun)}><Play size={15} />{currentRun ? "Running" : "Run"}</button></div></header>
      <div className="canvas-area">{activeCanvas ? <><div className="canvas-toolbar"><span><GitBranch size={15} />Graph editor</span><span className="revision-pill">{latestRevision ? `Latest revision ${latestRevision.revision}` : "No revision saved"}</span></div><div className="graph"><div className="node start-node"><span className="node-icon"><CirclePlay size={16} /></span><div><strong>Start</strong><small>Default entrypoint</small></div><span className="port output" /></div><div className="edge-line" /><div className="node task-node"><span className="node-icon"><CircleCheck size={16} /></span><div><strong>Review sources</strong><small>Agent task</small></div><span className="port input" /></div><div className="empty-hint">Canvas graph is ready for nodes and connections.</div></div></> : <div className="empty-state"><Folder size={24} /><strong>No canvas selected</strong><span>Create a canvas from the left navigation.</span></div>}</div>
    </section>
    <aside className="inspector"><div className="inspector-head"><span>RUN INSPECTOR</span><span className={`state-chip ${activeCanvas?.status ?? "idle"}`}>{activeCanvas?.status ?? "idle"}</span></div><section><h2>Canvas</h2><dl><div><dt>Entrypoint</dt><dd>{activeCanvas?.defaultEntrypointNodeId ? "Default · Start" : "Not configured"}</dd></div><div><dt>Revision</dt><dd>{activeCanvas?.revision ?? "-"}</dd></div><div><dt>Latest run</dt><dd>{activeCanvas ? (snapshot.runs.find((run) => run.canvasId === activeCanvas.id)?.status ?? "None") : "-"}</dd></div></dl></section><section><h2>Next step</h2><p className="inspector-copy">This slice proves the Host boundary. The next runtime increment adds a real LocalRestricted worker behind the same Run command.</p></section></aside>
    {notice ? <div className="toast"><Bell size={15} /><span>{notice}</span><button onClick={() => setNotice(undefined)} aria-label="Dismiss">×</button></div> : null}
  </main>;
}

function WorkspaceRow({ workspace, open, selected, onToggle, onSelect, canvases, canvasId, onCanvasSelect }: { workspace: Workspace; open: boolean; selected: boolean; onToggle: () => void; onSelect: () => void; canvases: Canvas[]; canvasId?: string; onCanvasSelect: (id: string) => void }) {
  return <div className={`workspace-row ${selected ? "selected" : ""}`}><div className="workspace-label"><button className="disclosure" aria-label={open ? `Collapse ${workspace.name}` : `Expand ${workspace.name}`} onClick={onToggle}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button><button className="workspace-select" onClick={onSelect}><Folder size={15} /><span>{workspace.name}</span></button></div>{open ? <div className="canvas-list">{canvases.map((canvas) => <button key={canvas.id} className={`canvas-row ${canvas.id === canvasId ? "selected" : ""}`} onClick={() => onCanvasSelect(canvas.id)}><CirclePlay size={13} /><span>{canvas.name}</span><span className={`mini-status ${canvas.status}`} /></button>)}</div> : null}</div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
