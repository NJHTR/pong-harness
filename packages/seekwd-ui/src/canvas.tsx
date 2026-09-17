import { type HTMLAttributes, type ReactNode } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, MoreHorizontal, Package, Zap } from "lucide-react";
import { IconButton, StatusBadge } from "./primitives";

export type NodeState = "idle" | "running" | "waiting" | "success" | "error";

export interface NodePort {
  id: string;
  label: string;
  kind?: "data" | "flow" | "event" | "resource";
}

export interface CanvasNodeProps extends HTMLAttributes<HTMLElement> {
  title: string;
  typeLabel: string;
  icon?: ReactNode;
  state?: NodeState;
  selected?: boolean;
  inputs?: NodePort[];
  outputs?: NodePort[];
  footer?: ReactNode;
}

const stateLabels: Record<NodeState, string> = {
  idle: "Ready",
  running: "Running",
  waiting: "Waiting",
  success: "Complete",
  error: "Failed",
};

export function CanvasNode({ title, typeLabel, icon, state = "idle", selected = false, inputs = [], outputs = [], footer, className = "", ...props }: CanvasNodeProps) {
  const tone = state === "success" ? "success" : state === "error" ? "danger" : state === "waiting" ? "warning" : state === "running" ? "info" : "neutral";
  return (
    <article className={`sk-node is-${state} ${selected ? "is-selected" : ""} ${className}`} {...props}>
      <header className="sk-node__header">
        <span className="sk-node__icon">{icon}</span>
        <span className="sk-node__heading"><strong>{title}</strong><small>{typeLabel}</small></span>
        <IconButton label="Node actions" size="small"><MoreHorizontal /></IconButton>
      </header>
      <div className="sk-node__ports">
        <div>{inputs.map((port) => <Port key={port.id} direction="input" {...port} />)}</div>
        <div>{outputs.map((port) => <Port key={port.id} direction="output" {...port} />)}</div>
      </div>
      <footer className="sk-node__footer"><StatusBadge tone={tone} dot>{stateLabels[state]}</StatusBadge>{footer ? <span>{footer}</span> : null}</footer>
    </article>
  );
}

export interface PortProps extends NodePort {
  direction: "input" | "output";
}

export function Port({ label, kind = "data", direction }: PortProps) {
  const PortIcon = kind === "flow" ? ArrowRight : kind === "event" ? Zap : kind === "resource" ? Package : direction === "input" ? ArrowDownToLine : ArrowUpFromLine;
  return <div className={`sk-port sk-port--${direction} sk-port--${kind}`}><PortIcon className="sk-port__icon" aria-hidden="true" /><span>{label}</span></div>;
}
