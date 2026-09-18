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
  nodeId?: string;
  title: string;
  typeLabel: string;
  icon?: ReactNode;
  state?: NodeState;
  selected?: boolean;
  primary?: boolean;
  inputs?: NodePort[];
  outputs?: NodePort[];
  footer?: ReactNode;
  activePortKey?: string | null;
  acceptingConnectionKind?: NodePort["kind"] | null;
  onPortConnect?: (portId: string, direction: "input" | "output", kind: NonNullable<NodePort["kind"]>) => void;
}

const stateLabels: Record<NodeState, string> = {
  idle: "Ready",
  running: "Running",
  waiting: "Waiting",
  success: "Complete",
  error: "Failed",
};

export function CanvasNode({ nodeId, title, typeLabel, icon, state = "idle", selected = false, primary = false, inputs = [], outputs = [], footer, activePortKey = null, acceptingConnectionKind = null, onPortConnect, className = "", ...props }: CanvasNodeProps) {
  const tone = state === "success" ? "success" : state === "error" ? "danger" : state === "waiting" ? "warning" : state === "running" ? "info" : "neutral";
  const portKey = (portId: string) => `${nodeId ?? title}:${portId}`;
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
          <PortGroup direction="input" ports={inputs} activePortKey={activePortKey} acceptingConnectionKind={acceptingConnectionKind} portKey={portKey} onPortConnect={onPortConnect} />
        </div>
        <div className="sk-node__lane sk-node__lane--output" aria-label="Outputs">
          <PortGroup direction="output" ports={outputs} activePortKey={activePortKey} acceptingConnectionKind={null} portKey={portKey} onPortConnect={onPortConnect} />
        </div>
      </div>
      <footer className="sk-node__footer"><StatusBadge tone={tone} dot>{stateLabels[state]}</StatusBadge>{footer ? <span>{footer}</span> : null}</footer>
    </article>
  );
}

const visiblePortLimit = 4;
const expandedPortLimit = 12;

interface PortGroupProps {
  ports: NodePort[];
  direction: "input" | "output";
  activePortKey: string | null;
  acceptingConnectionKind: NodePort["kind"] | null;
  portKey: (portId: string) => string;
  onPortConnect?: (portId: string, direction: "input" | "output", kind: NonNullable<NodePort["kind"]>) => void;
}

function PortGroup({ ports, direction, activePortKey, acceptingConnectionKind, portKey, onPortConnect }: PortGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const visiblePorts = ports.slice(0, expanded ? expandedPortLimit : visiblePortLimit);
  const hiddenCount = Math.max(0, ports.length - visiblePorts.length);
  return <div className={`sk-port-group sk-port-group--${direction}`}>
    {visiblePorts.map((port) => {
      const kind = port.kind ?? "data";
      return <Port key={port.id} direction={direction} active={activePortKey === portKey(port.id)} accepting={direction === "input" && acceptingConnectionKind === kind} onConnect={onPortConnect ? () => onPortConnect(port.id, direction, kind) : undefined} {...port} />;
    })}
    {!expanded && hiddenCount > 0 ? <button type="button" className="sk-port-group__more" onClick={() => setExpanded(true)}><ChevronDown /><span>{hiddenCount} more</span></button> : null}
    {expanded && hiddenCount > 0 ? <span className="sk-port-group__summary">{hiddenCount} more in Inspector</span> : null}
    {expanded && ports.length > visiblePortLimit ? <button type="button" className="sk-port-group__more" onClick={() => setExpanded(false)}><ChevronDown className="is-expanded" /><span>Collapse</span></button> : null}
  </div>;
}

export interface PortProps extends NodePort {
  direction: "input" | "output";
  active?: boolean;
  accepting?: boolean;
  onConnect?: () => void;
}

export function Port({ label, kind = "data", direction, connectionCount = 0, active = false, accepting = false, onConnect }: PortProps) {
  const PortIcon = kind === "flow" ? ArrowRight : kind === "event" ? Zap : kind === "resource" ? Package : direction === "input" ? ArrowDownToLine : ArrowUpFromLine;
  const socketLabel = `${direction === "input" ? "Connect to" : "Connect from"} ${label}`;
  return <div className={`sk-port sk-port--${direction} sk-port--${kind} ${connectionCount > 0 ? "is-connected" : ""} ${accepting ? "is-accepting" : ""}`}>
    <button type="button" className={`sk-port__socket ${active ? "is-active" : ""}`} aria-label={socketLabel} title={socketLabel} aria-pressed={active} onClick={onConnect}>
      <PortIcon aria-hidden="true" />
    </button>
    <span title={label}>{label}</span>
    {connectionCount > 1 ? <small title={`${connectionCount} connections`}>{connectionCount > 99 ? "99+" : connectionCount}</small> : null}
  </div>;
}
