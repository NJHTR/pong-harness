import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleAlert, CircleCheck, Clock3, LoaderCircle, X } from "lucide-react";

type ButtonVariant = "default" | "primary" | "quiet" | "danger";
type ControlSize = "small" | "medium";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "medium", leadingIcon, className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`sk-button sk-button--${variant} sk-control--${size} ${className}`}
      {...props}
    >
      {leadingIcon ? <span className="sk-button__icon">{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  ),
);
Button.displayName = "Button";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: ControlSize;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = "medium", active = false, className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`sk-icon-button sk-control--${size} ${active ? "is-active" : ""} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = "IconButton";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  description?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
  clearable?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, description, error, leadingIcon, trailingAction, clearable = false, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const describedBy = error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined;
    return (
      <div className={`sk-field ${className}`}>
        {label ? <label className="sk-field__label" htmlFor={fieldId}>{label}</label> : null}
        <span className={`sk-field__control ${leadingIcon ? "has-leading" : ""} ${error ? "is-error" : ""}`}>
          {leadingIcon ? <span className="sk-field__leading">{leadingIcon}</span> : null}
          <input ref={(element) => {
            inputRef.current = element;
            if (typeof ref === "function") ref(element);
            else if (ref) ref.current = element;
          }} id={fieldId} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />
          {clearable ? <button className="sk-field__clear" type="button" aria-label="Clear" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => {
            const input = inputRef.current;
            if (!input) return;
            const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
            valueSetter?.call(input, "");
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.focus();
          }}><svg viewBox="0 0 25.8008 25.459" aria-hidden="true"><path d="M25.44 12.725c0 7.002-5.713 12.714-12.725 12.714C5.713 25.44 0 19.727 0 12.725 0 5.713 5.713 0 12.715 0 19.727 0 25.44 5.713 25.44 12.725ZM16.348 7.87l-3.633 3.614L9.102 7.881a.854.854 0 0 0-.625-.264.884.884 0 0 0-.899.879c0 .244.098.459.274.635l3.603 3.603-3.603 3.604a.884.884 0 0 0-.274.635c0 .508.4.908.899.908.253 0 .478-.098.654-.274l3.584-3.603 3.594 3.603c.175.176.4.274.654.274.498 0 .898-.4.898-.908 0-.244-.078-.469-.263-.645l-3.604-3.594 3.613-3.613c.196-.195.264-.39.264-.644a.884.884 0 0 0-.889-.88c-.244 0-.439.079-.634.274Z" /></svg></button> : null}
          {trailingAction ? <span className="sk-field__trailing">{trailingAction}</span> : null}
        </span>
        {error ? (
          <span id={`${fieldId}-error`} className="sk-field__message is-error">
            {error}
          </span>
        ) : description ? (
          <span id={`${fieldId}-description`} className="sk-field__message">
            {description}
          </span>
        ) : null}
      </div>
    );
  },
);
TextField.displayName = "TextField";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, className = "", ...props }, ref) => (
  <label className={`sk-checkbox ${className}`}>
    <input ref={ref} type="checkbox" {...props} />
    <span className="sk-checkbox__box" aria-hidden="true">
      <svg viewBox="0 0 8.97949 8.61816"><path d="M3.184 8.618c.21 0 .376-.093.493-.273L8.29 1.079c.088-.142.122-.249.122-.361 0-.269-.176-.445-.444-.445-.196 0-.303.064-.42.25L3.164 7.51.89 4.53C.767 4.36.645 4.292.47 4.292.19 4.292 0 4.482 0 4.751c0 .112.049.239.142.356l2.534 3.228c.146.19.298.283.508.283Z" /></svg>
    </span>
    <span>{label}</span>
  </label>
));
Checkbox.displayName = "Checkbox";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, className = "", ...props }, ref) => (
    <label className={`sk-switch-row ${className}`}>
      <span className="sk-switch-row__copy">
        <span className="sk-switch-row__label">{label}</span>
        {description ? <span className="sk-switch-row__description">{description}</span> : null}
      </span>
      <span className="sk-switch">
        <input ref={ref} type="checkbox" role="switch" {...props} />
        <span className="sk-switch__track" aria-hidden="true"><span /></span>
      </span>
    </label>
  ),
);
Switch.displayName = "Switch";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  label?: string;
  compact?: boolean;
}

export function Progress({ value, label, compact = false, className = "", ...props }: ProgressProps) {
  const bounded = value == null ? undefined : Math.min(100, Math.max(0, value));
  return (
    <div className={`sk-progress-wrap ${className}`} {...props}>
      {label ? <div className="sk-progress__label"><span>{label}</span>{bounded != null ? <span>{bounded}%</span> : null}</div> : null}
      <div
        className={`sk-progress ${compact ? "is-compact" : ""} ${bounded == null ? "is-indeterminate" : ""}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bounded}
      >
        <span style={bounded == null ? undefined : { width: `${bounded}%` }} />
      </div>
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, label }: SegmentedControlProps<T>) {
  const move = (current: number, direction: number) => {
    const next = (current + direction + options.length) % options.length;
    onChange(options[next].value);
  };
  return (
    <div className="sk-segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          className={value === option.value ? "is-selected" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              move(options.indexOf(option), event.key === "ArrowRight" ? 1 : -1);
              const parent = event.currentTarget.parentElement;
              parent?.querySelectorAll("button")[(options.indexOf(option) + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length]?.focus();
            }
          }}
        >
          {option.icon}{option.label}
        </button>
      ))}
    </div>
  );
}

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  /** Retained for API compatibility. When enabled, renders a semantic SVG status icon. */
  dot?: boolean;
}

export function StatusBadge({ tone = "neutral", dot = false, className = "", children, ...props }: StatusBadgeProps) {
  const StatusIcon = tone === "info"
    ? LoaderCircle
    : tone === "success"
      ? Check
      : tone === "warning"
        ? Clock3
        : tone === "danger"
          ? CircleAlert
          : CircleCheck;

  return <span className={`sk-status sk-status--${tone} ${className}`} {...props}>
    {dot ? <StatusIcon className="sk-status__icon" aria-hidden="true" /> : null}
    {children}
  </span>;
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
}

export function Tooltip({ content, children, side = "bottom" }: TooltipProps) {
  return <span className={`sk-tooltip sk-tooltip--${side}`}><span className="sk-tooltip__anchor">{children}</span><span role="tooltip">{content}</span></span>;
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  checked?: boolean;
  separatorBefore?: boolean;
}

export interface MenuProps {
  label: string;
  items: MenuItem[];
  icon?: ReactNode;
  defaultOpen?: boolean;
  inline?: boolean;
}

export function Menu({ label, items, icon, defaultOpen = false, inline = false }: MenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  const focusItem = (index: number) => {
    const enabled = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)") ?? [])];
    enabled[(index + enabled.length) % enabled.length]?.focus();
  };
  const menu = <div className="sk-menu" role="menu" ref={menuRef} aria-label={label} onKeyDown={(event) => {
    const enabled = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)") ?? [])];
    const current = enabled.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" && !inline) { setOpen(false); rootRef.current?.querySelector("button")?.focus(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); focusItem(current + (event.key === "ArrowDown" ? 1 : -1)); }
  }}>
    {items.map((item, index) => <div key={`${item.label}-${index}`} className={item.separatorBefore ? "sk-menu__separator" : ""}><button type="button" role="menuitem" disabled={item.disabled} onClick={() => { item.onSelect(); if (!inline) setOpen(false); }}><span className="sk-menu__icon">{item.checked ? <Check /> : item.icon}</span><span>{item.label}</span></button></div>)}
  </div>;
  if (inline) return <div className="sk-menu-root is-inline" ref={rootRef}>{menu}</div>;
  return (
    <div className="sk-menu-root" ref={rootRef}>
      <button type="button" className="sk-menu-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); requestAnimationFrame(() => focusItem(0)); }
      }}>{icon}<span>{label}</span><ChevronDown /></button>
      {open ? menu : null}
    </div>
  );
}

export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

export function Dialog({ open, title, description, children, onClose, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, portalHost]);
  const titleId = useId();
  return <><span hidden ref={(element) => {
    if (element) setPortalHost(element.closest<HTMLElement>("[data-sk-theme]") ?? document.body);
  }} />{portalHost ? createPortal(<dialog ref={ref} className="sk-dialog" aria-labelledby={titleId} onClose={onClose} onClick={(event) => {
    if (event.target === ref.current) onClose();
  }}><header><strong id={titleId}>{title}</strong><IconButton label="Close dialog" size="small" onClick={onClose}><X /></IconButton></header>{description ? <p className="sk-dialog__description">{description}</p> : null}<div className="sk-dialog__body">{children}</div>{footer ? <footer>{footer}</footer> : null}</dialog>, portalHost) : null}</>;
}

export interface NoticeProps {
  title: string;
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
  onDismiss?: () => void;
}

export function Notice({ title, children, tone = "info", onDismiss }: NoticeProps) {
  return <div className={`sk-notice sk-notice--${tone}`} role={tone === "danger" ? "alert" : "status"}><span className="sk-notice__marker" /><div><strong>{title}</strong><p>{children}</p></div>{onDismiss ? <IconButton label="Dismiss notice" size="small" onClick={onDismiss}><X /></IconButton> : null}</div>;
}

export interface MessageBoxProps {
  open: boolean;
  title: string;
  children: ReactNode;
  icon: ReactNode;
  actionLabel?: string;
  onClose: () => void;
}

/** A compact, icon-led confirmation surface matching the WebSwift/macOS reference. */
export function MessageBox({ open, title, children, icon, actionLabel = "OK", onClose }: MessageBoxProps) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, portalHost]);
  return <><span hidden ref={(element) => {
    if (element) setPortalHost(element.closest<HTMLElement>("[data-sk-theme]") ?? document.body);
  }} />{portalHost ? createPortal(
      <dialog ref={ref} className="sk-messagebox" aria-labelledby={titleId} onClose={onClose} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
        <div className="sk-messagebox__icon" aria-hidden="true">{icon}</div>
        <strong id={titleId}>{title}</strong>
        <p>{children}</p>
        <Button variant="primary" onClick={onClose}>{actionLabel}</Button>
      </dialog>, portalHost) : null}</>;
}

export interface NotificationProps {
  title: string;
  children: ReactNode;
  icon: ReactNode;
  time?: string;
  onDismiss?: () => void;
}

/** A transient, system-style banner for low-risk completion feedback. */
export function Notification({ title, children, icon, time = "now", onDismiss }: NotificationProps) {
  const [closing, setClosing] = useState(false);
  const dismiss = () => {
    if (onDismiss && !closing) setClosing(true);
  };
  return <div className={`sk-macos-notification ${closing ? "is-closing" : ""}`} role="status" onClick={dismiss} onAnimationEnd={() => {
    if (closing) onDismiss?.();
  }}>
    <span className="sk-macos-notification__icon" aria-hidden="true">{icon}</span>
    <span className="sk-macos-notification__content"><strong>{title}</strong><span>{children}</span></span>
    <time>{time}</time>
  </div>;
}
