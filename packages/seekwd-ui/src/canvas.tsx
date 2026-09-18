import { useState, type HTMLAttributes, type ReactNode } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ChevronDown, CirclePlay, MoreHorizontal, Package, Zap } from "lucide-react";
import { IconButton, StatusBadge } from "./primitives";

export type NodeState = "idle" | "running" | "waiting" | "success" | "error";

export interface NodePort {
  id: string;
  label: string;
  kind?: "data" | "flow" | "event" | "resource";
  connectionCount?: number;
}

export interface CanvasNodeProps extends HTMLAttributes<HTMLElement> {
  title: string;
  typeLabel: string;
  icon?: ReactNode;
  state?: NodeState;
  selected?: boolean;
  primary?: boolean;
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

export function CanvasNode({ title, typeLabel, icon, state = "idle", selected = false, primary = false, inputs = [], outputs = [], footer, className = "", ...props }: CanvasNodeProps) {
  const tone = state === "success" ? "success" : state === "error" ? "danger" : state === "waiting" ? "warning" : state === "running" ? "info" : "neutral";
  return (
    <article className={`sk-node is-${state} ${selected ? "is-selected" : ""} ${primary ? "is-primary" : ""} ${className}`} {...props}>
      <header className="sk-node__header">
        <span className="sk-node__icon">{icon}</span>
        <span className="sk-node__heading">
          <strong title={title}>{title}</strong>
          <span className="sk-node__meta">{primary ? <><CirclePlay className="sk-node__entry-icon" />Canvas entry</> : typeLabel}</span>
        </span>
        <IconButton label="Node actions" size="small"><MoreHorizontal /></IconButton>
      </header>
      <div className="sk-node__body">
        <div className="sk-node__lane sk-node__lane--input" aria-label="Inputs">
          <PortGroup direction="input" ports={inputs} />
        </div>
        <div className="sk-node__lane sk-node__lane--output" aria-label="Outputs">
          <PortGroup direction="output" ports={outputs} />
        </div>
      </div>
      <footer className="sk-node__footer"><StatusBadge tone={tone} dot>{stateLabels[state]}</StatusBadge>{footer ? <span>{footer}</span> : null}</footer>
    </article>
  );
}

const visiblePortLimit = 4;
const expandedPortLimit = 12;

function PortGroup({ ports, direction }: { ports: NodePort[]; direction: "input" | "output" }) {
  const [expanded, setExpanded] = useState(false);
  const visiblePorts = ports.slice(0, expanded ? expandedPortLimit : visiblePortLimit);
  const hiddenCount = Math.max(0, ports.length - visiblePorts.length);
  return <div className={`sk-port-group sk-port-group--${direction}`}>
    {visiblePorts.map((port) => <Port key={port.id} direction={direction} {...port} />)}
    {!expanded && hiddenCount > 0 ? <button type="button" className="sk-port-group__more" onClick={() => setExpanded(true)}><ChevronDown /><span>{hiddenCount} more</span></button> : null}
    {expanded && hiddenCount > 0 ? <span className="sk-port-group__summary">{hiddenCount} more in Inspector</span> : null}
    {expanded && ports.length > visiblePortLimit ? <button type="button" className="sk-port-group__more" onClick={() => setExpanded(false)}><ChevronDown className="is-expanded" /><span>Collapse</span></button> : null}
  </div>;
}

export interface PortProps extends NodePort {
  direction: "input" | "output";
}

export function Port({ label, kind = "data", direction, connectionCount = 0 }: PortProps) {
  const PortIcon = kind === "flow" ? ArrowRight : kind === "event" ? Zap : kind === "resource" ? Package : direction === "input" ? ArrowDownToLine : ArrowUpFromLine;
  return <div className={`sk-port sk-port--${direction} sk-port--${kind}`}><PortIcon className="sk-port__icon" aria-hidden="true" /><span title={label}>{label}</span>{connectionCount > 1 ? <small title={`${connectionCount} connections`}>{connectionCount > 99 ? "99+" : connectionCount}</small> : null}</div>;
}
