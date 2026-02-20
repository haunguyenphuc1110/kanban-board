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

Input.displayName = "Input";
