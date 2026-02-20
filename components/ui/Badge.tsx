interface BadgeProps {
  label: string;
  /** Hex color string used for dynamic category badge backgrounds */
  backgroundColor?: string;
  variant?: "priority" | "category" | "overdue";
}

/**
 * Maps a normalized priority label to the appropriate Tailwind color classes.
 * Falls back to a neutral surface when the label is unrecognized.
 */
const priorityVariants: Record<string, string> = {
  low:    "bg-success/30 text-foreground",
  medium: "bg-accent/30 text-foreground",
  high:   "bg-primary text-foreground",
  urgent: "bg-secondary text-surface",
};

/**
 * Neo-Brutalism badge used for priority labels, category chips, and overdue indicators.
 *
 * - `overdue`  — always red (bg-secondary / text-surface)
 * - `priority` — color derived from the priority level embedded in `label`
 * - `category` — dynamic hex `backgroundColor` via inline style; falls back to bg-surface
 */
export function Badge({ label, backgroundColor, variant = "category" }: BadgeProps) {
  const baseClasses = [
    "inline-flex items-center",
    "border-[length:var(--border-width)] border-foreground",
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
    const colorClass =
      priorityVariants[label.toLowerCase()] ?? "bg-surface text-foreground";
    return (
      <span className={`${baseClasses} ${colorClass}`}>
        {label}
      </span>
    );
  }

  // Category badge — relies on an inline style for runtime-generated hex colors
  // because Tailwind cannot generate arbitrary dynamic class names at build time.
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
