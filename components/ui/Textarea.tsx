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
            // Shadow grows on focus, matching Input behavior
            "focus:shadow-[var(--shadow-hover)]",
            // Red border on error
            error ? "border-secondary shadow-[var(--shadow)]" : "",
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
