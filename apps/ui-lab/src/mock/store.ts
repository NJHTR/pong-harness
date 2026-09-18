import { useEffect, useState } from "react";
import { createMockSeekwdApi } from "./adapter";
import type { Canvas, CanvasGraph, NotificationItem, RunSession, RuntimeEvent, Workspace } from "./types";

export const mockApi = createMockSeekwdApi();

export interface WorkbenchSnapshot {
  workspaces: Workspace[];
  canvases: Record<string, Canvas[]>;
  graphs: Record<string, CanvasGraph>;
  runs: Record<string, RunSession>;
  notifications: NotificationItem[];
}

const emptySnapshot: WorkbenchSnapshot = { workspaces: [], canvases: {}, graphs: {}, runs: {}, notifications: [] };

function applyEvent(snapshot: WorkbenchSnapshot, event: RuntimeEvent): WorkbenchSnapshot {
  const next: WorkbenchSnapshot = { ...snapshot, workspaces: [...snapshot.workspaces], canvases: { ...snapshot.canvases }, graphs: { ...snapshot.graphs }, runs: { ...snapshot.runs }, notifications: [...snapshot.notifications] };
  if (event.type === "workspace.updated") next.workspaces = next.workspaces.some((item) => item.id === event.workspace.id) ? next.workspaces.map((item) => item.id === event.workspace.id ? event.workspace : item) : [...next.workspaces, event.workspace];
  if (event.type === "canvas.updated") { const list = next.canvases[event.canvas.workspaceId] ?? []; next.canvases[event.canvas.workspaceId] = list.some((item) => item.id === event.canvas.id) ? list.map((item) => item.id === event.canvas.id ? event.canvas : item) : [...list, event.canvas]; const graph = next.graphs[event.canvas.id]; if (graph) next.graphs[event.canvas.id] = { ...graph, canvas: event.canvas }; }
  if (event.type === "run.created" || event.type === "run.updated") next.runs[event.run.id] = event.run;
  if (event.type === "notification.created") next.notifications = [event.notification, ...next.notifications.filter((item) => item.id !== event.notification.id)];
  if (event.type === "notification.dismissed") next.notifications = next.notifications.filter((item) => item.id !== event.notificationId);
  return next;
}

export function useWorkbenchSnapshot() {
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot>(emptySnapshot);
  useEffect(() => {
    let active = true;
    Promise.all([mockApi.listWorkspaces(), mockApi.listNotifications()]).then(([workspaces, notifications]) => { if (active) setSnapshot((current) => ({ ...current, workspaces, notifications })); });
    const unsubscribe = mockApi.subscribe((event) => setSnapshot((current) => applyEvent(current, event)));
    return () => { active = false; unsubscribe(); };
  }, []);
  return snapshot;
}

export function useCanvasGraph(canvasId?: string) {
  const [graph, setGraph] = useState<CanvasGraph | null>(null);
  useEffect(() => {
    let active = true;
    setGraph(null);
    if (!canvasId) return () => { active = false; };
    mockApi.getCanvasGraph(canvasId).then((next) => { if (active) setGraph(next); });
    const unsubscribe = mockApi.subscribe((event) => {
      if (!active) return;
      if (event.type === "canvas.updated" && event.canvas.id === canvasId) mockApi.getCanvasGraph(canvasId).then((next) => { if (active) setGraph(next); });
      if (event.type === "node.updated" && event.node.canvasId === canvasId) mockApi.getCanvasGraph(canvasId).then((next) => { if (active) setGraph(next); });
    });
    return () => { active = false; unsubscribe(); };
  }, [canvasId]);
  return graph;
}

export function useCanvasRuns(canvasId?: string) {
  const [runs, setRuns] = useState<RunSession[]>([]);
  useEffect(() => {
    let active = true;
    if (!canvasId) return () => { active = false; };
    mockApi.listRuns({ type: "canvas", canvasId }).then((next) => { if (active) setRuns(next); });
    const unsubscribe = mockApi.subscribe((event) => { if (active && (event.type === "run.created" || event.type === "run.updated") && event.run.rootCanvasId === canvasId) setRuns((current) => [event.run, ...current.filter((run) => run.id !== event.run.id)]); });
    return () => { active = false; unsubscribe(); };
  }, [canvasId]);
  return runs;
}

