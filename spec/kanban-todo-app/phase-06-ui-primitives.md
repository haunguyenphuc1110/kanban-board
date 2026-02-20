# Phase 6 — UI Primitives

All components live in `components/ui/`. They form the foundation for every other component.
**Rules:**
1. Never hardcode shadow, border, or color values — always use CSS variables via Tailwind tokens.
2. All components are client components (`"use client"` only where state/events are needed).
3. Compose from these primitives; do not inline their logic in higher-level components.

---

## 6.1 Button (`components/ui/Button.tsx`)

Three variants that share Neo-Brutalism press behavior (active state collapses shadow):

```typescript
// components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:   "bg-primary text-foreground border-foreground hover:shadow-[var(--shadow-hover)]",
  secondary: "bg-secondary text-surface border-foreground hover:shadow-[var(--shadow-hover)]",
  ghost:     "bg-surface text-foreground border-foreground hover:shadow-[var(--shadow-hover)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm font-bold",
  md: "px-6 py-3 text-base font-bold",
  lg: "px-8 py-4 text-lg font-bold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          "border-[length:var(--border-width)]",
          "shadow-[var(--shadow)]",
          "transition-all duration-100",
          // Active press: translate right+down, remove shadow
          "active:translate-x-[4px] active:translate-y-[4px] active:shadow-[var(--shadow-active)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

**Usage:**
```tsx
<Button variant="primary" size="md" onClick={handleCreate}>
  New Todo
</Button>
<Button variant="secondary" onClick={handleDelete}>
  Delete
</Button>
<Button variant="ghost" size="sm">
  Cancel
</Button>
```

---

## 6.2 Input (`components/ui/Input.tsx`)

```typescript
// components/ui/Input.tsx
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-bold text-foreground uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "border-[length:var(--border-width)] border-foreground",
            "bg-surface text-foreground",
            "px-3 py-2",
            "shadow-[var(--shadow)]",
            "outline-none",
            // Shadow grows on focus
            "focus:shadow-[var(--shadow-hover)]",
            // Red border on error
            error ? "border-secondary shadow-[4px_4px_0px_var(--secondary)]" : "",
            className,
          ].join(" ")}
          {...props}
        />
        {error && (
          <span className="text-xs font-bold text-secondary">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
```

---

## 6.3 Modal (`components/ui/Modal.tsx`)

Fixed overlay with a large offset shadow on the panel. The header bar uses `bg-primary` by default
but accepts a `headerColor` prop for variety.

```typescript
// components/ui/Modal.tsx
"use client";

import { useEffect, ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerColor?: string;  // Tailwind bg- class, default: "bg-primary"
  children: ReactNode;
  maxWidth?: string;     // Tailwind max-w- class, default: "max-w-lg"
}

export function Modal({
  isOpen,
  onClose,
  title,
  headerColor = "bg-primary",
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className={[
          "relative w-full",
          maxWidth,
          "border-[length:var(--border-width)] border-foreground",
          "bg-surface",
          "shadow-[8px_8px_0px_var(--border-color)]",
        ].join(" ")}
      >
        {/* Header bar */}
        <div
          className={[
            headerColor,
            "flex items-center justify-between",
            "border-b-[length:var(--border-width)] border-foreground",
            "px-5 py-3",
          ].join(" ")}
        >
          <h2 className="text-lg font-black text-foreground uppercase tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-foreground/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
```

---

## 6.4 Badge (`components/ui/Badge.tsx`)

Used for priority labels and categories. Categories pass a hex color via `style` prop since
Tailwind can't generate arbitrary dynamic colors at runtime.

```typescript
// components/ui/Badge.tsx
interface BadgeProps {
  label: string;
  backgroundColor?: string; // hex color for category badges
  variant?: "priority" | "category" | "overdue";
}

const priorityVariants: Record<string, string> = {
  low:    "bg-success/30 text-foreground",
  medium: "bg-accent/30 text-foreground",
  high:   "bg-primary text-foreground",
  urgent: "bg-secondary text-surface",
};

export function Badge({ label, backgroundColor, variant = "category" }: BadgeProps) {
  const baseClasses = [
    "inline-flex items-center",
    "border-[2px] border-foreground",
    "px-2 py-0.5",
    "text-xs font-bold uppercase tracking-wide",
  ].join(" ");

  if (variant === "overdue") {
    return (
      <span className={`${baseClasses} bg-secondary text-surface`}>
        OVERDUE
      </span>
    );
  }

  if (variant === "priority") {
    const colorClass = priorityVariants[label.toLowerCase()] ?? "bg-surface text-foreground";
    return (
      <span className={`${baseClasses} ${colorClass}`}>
        {label}
      </span>
    );
  }

  // Category badge — uses inline style for dynamic hex color
  return (
    <span
      className={baseClasses}
      style={
        backgroundColor
          ? { backgroundColor, color: "#1A1A1A" }
          : undefined
      }
    >
      {label}
    </span>
  );
}
```

---

## 6.5 Textarea (`components/ui/Textarea.tsx`)

Used in `AddTodoModal` for the description field. Same styling as `Input`.

```typescript
// components/ui/Textarea.tsx
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const areaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={areaId}
            className="text-sm font-bold text-foreground uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={[
            "border-[length:var(--border-width)] border-foreground",
            "bg-surface text-foreground",
            "px-3 py-2",
            "shadow-[var(--shadow)]",
            "outline-none resize-none",
            "focus:shadow-[var(--shadow-hover)]",
            error ? "border-secondary" : "",
            className,
          ].join(" ")}
          {...props}
        />
        {error && (
          <span className="text-xs font-bold text-secondary">{error}</span>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
```

---

## 6.6 Select (`components/ui/Select.tsx`)

Used for priority and status dropdowns in the todo form.

```typescript
// components/ui/Select.tsx
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", children, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-bold text-foreground uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            "border-[length:var(--border-width)] border-foreground",
            "bg-surface text-foreground",
            "px-3 py-2",
            "shadow-[var(--shadow)]",
            "outline-none appearance-none cursor-pointer",
            "focus:shadow-[var(--shadow-hover)]",
            className,
          ].join(" ")}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-xs font-bold text-secondary">{error}</span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
```
