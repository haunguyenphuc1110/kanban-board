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
            // appearance-none removes the browser's native dropdown arrow so we
            // can apply consistent Neo-Brutalism styling across all browsers.
            "outline-none appearance-none cursor-pointer",
            // Shadow grows on focus, matching Input and Textarea behavior
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
