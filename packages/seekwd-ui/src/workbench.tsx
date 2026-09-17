import { type HTMLAttributes, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface WindowFrameProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  inspector?: ReactNode;
  bottomPanel?: ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  onZoom?: () => void;
}

export function WindowFrame({ title, subtitle, toolbar, sidebar, inspector, bottomPanel, onClose, onMinimize, onZoom, children, className = "", ...props }: WindowFrameProps) {
  return (
    <div className={`sk-window ${className}`} {...props}>
      <header className="sk-titlebar">
        <div className="sk-traffic" aria-label="Window controls" role="group">
          <button type="button" className="sk-traffic__light sk-traffic__close" aria-label="Close window" onClick={onClose} tabIndex={onClose ? 0 : -1}>
            <svg viewBox="0 0 20.1197 19.7779" aria-hidden="true">
              <path d="M.275 19.503a.968.968 0 0 0 1.357 0l8.242-8.252 8.252 8.252a.967.967 0 0 0 1.348 0 .951.951 0 0 0 0-1.347l-8.242-8.252 8.242-8.252a.94.94 0 0 0 0-1.348.97.97 0 0 0-1.348 0L9.874 8.556 1.632.304a.97.97 0 0 0-1.357 0 .951.951 0 0 0 0 1.348l8.252 8.252-8.252 8.252a.94.94 0 0 0 0 1.347Z" />
            </svg>
          </button>
          <button type="button" className="sk-traffic__light sk-traffic__minimize" aria-label="Minimize window" onClick={onMinimize} tabIndex={onMinimize ? 0 : -1}>
            <svg viewBox="0 0 20.918 1.94336" aria-hidden="true">
              <path d="M.957 1.943H19.6a.96.96 0 0 0 .957-.957.96.96 0 0 0-.957-.957H.957A.96.96 0 0 0 0 .986c0 .518.44.957.957.957Z" />
            </svg>
          </button>
          <button type="button" className="sk-traffic__light sk-traffic__zoom" aria-label="Zoom window" onClick={onZoom} tabIndex={onZoom ? 0 : -1}>
            <svg viewBox="0 0 24.2383 23.8965" aria-hidden="true">
              <path d="M.986 10.03c.567 0 .967-.42.967-.997V7.314l-.224-4.306 3.632 3.76 4.004 4.042a.94.94 0 0 0 .684.284c.605 0 1.045-.4 1.045-1.006a.99.99 0 0 0-.293-.722L6.777 5.332 3.008 1.719l4.316.224h1.719c.566 0 1.006-.39 1.006-.966C10.049.4 9.619 0 9.043 0H1.719C.635 0 0 .635 0 1.719v7.314c0 .557.41.996.986.996Zm13.848 13.857h7.314c1.094 0 1.729-.635 1.729-1.719v-7.314c0-.557-.41-.997-.986-.997-.567 0-.967.42-.967.997v1.718l.224 4.307-3.642-3.76-3.994-4.043a.941.941 0 0 0-.684-.283c-.605 0-1.045.4-1.045 1.006 0 .273.098.527.293.722l4.024 4.034 3.77 3.613-4.327-.225h-1.709c-.566 0-1.006.39-1.006.967 0 .576.43.976 1.006.976Z" />
            </svg>
          </button>
        </div>
        <div className="sk-titlebar__title"><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</div>
        <div className="sk-titlebar__toolbar">{toolbar}</div>
      </header>
      <div className={`sk-workbench ${sidebar ? "" : "sk-workbench--no-sidebar"} ${inspector ? "" : "sk-workbench--no-inspector"}`}>
        {sidebar ? <aside className="sk-sidebar">{sidebar}</aside> : null}
        <main className="sk-workbench__main">{children}</main>
        {inspector ? <aside className="sk-inspector">{inspector}</aside> : null}
      </div>
      {bottomPanel ? <section className="sk-bottom-panel">{bottomPanel}</section> : null}
    </div>
  );
}

export function Toolbar({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`sk-toolbar ${className}`} role="toolbar" {...props}>{children}</div>;
}

export function ToolbarDivider() {
  return <span className="sk-toolbar__divider" aria-hidden="true" />;
}

export interface SidebarSectionProps {
  label: string;
  children: ReactNode;
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return <section className="sk-sidebar-section"><h3>{label}</h3>{children}</section>;
}

export interface SidebarGroupProps {
  label: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A compact disclosure group for second-level workspace navigation. */
export function SidebarGroup({ label, icon, trailing, active = false, defaultOpen = false, children }: SidebarGroupProps) {
  return (
    <details className={`sk-sidebar-group ${active ? "is-active" : ""}`} open={defaultOpen}>
      <summary>
        {icon ? <span className="sk-sidebar-group__icon">{icon}</span> : <span />}
        <span className="sk-sidebar-group__label">{label}</span>
        {trailing ? <span className="sk-sidebar-group__trailing">{trailing}</span> : null}
        <ChevronRight className="sk-sidebar-group__chevron" aria-hidden="true" />
      </summary>
      <div className="sk-sidebar-group__children">{children}</div>
    </details>
  );
}

export interface SidebarItemProps extends HTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  active?: boolean;
  trailing?: ReactNode;
}

export function SidebarItem({ icon, active = false, trailing, className = "", children, ...props }: SidebarItemProps) {
  return <button type="button" className={`sk-sidebar-item ${active ? "is-active" : ""} ${className}`} {...props}>{icon ? <span>{icon}</span> : null}<span className="sk-sidebar-item__label">{children}</span>{trailing ? <span className="sk-sidebar-item__trailing">{trailing}</span> : null}</button>;
}

export interface InspectorSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
}

export function InspectorSection({ title, children, defaultOpen = true, action }: InspectorSectionProps) {
  return (
    <details className="sk-inspector-section" open={defaultOpen}>
      <summary><span className="sk-inspector-section__chevrons"><ChevronRight className="closed" /><ChevronDown className="open" /></span><strong>{title}</strong>{action ? <span className="sk-inspector-section__action">{action}</span> : null}</summary>
      <div className="sk-inspector-section__body">{children}</div>
    </details>
  );
}

export interface PropertyRowProps {
  label: ReactNode;
  children: ReactNode;
  vertical?: boolean;
}

export function PropertyRow({ label, children, vertical = false }: PropertyRowProps) {
  return <div className={`sk-property-row ${vertical ? "is-vertical" : ""}`}><span className="sk-property-row__label">{label}</span><div className="sk-property-row__control">{children}</div></div>;
}

export interface PanelHeaderProps {
  title: string;
  trailing?: ReactNode;
}

export function PanelHeader({ title, trailing }: PanelHeaderProps) {
  return <header className="sk-panel-header"><strong>{title}</strong>{trailing}</header>;
}
