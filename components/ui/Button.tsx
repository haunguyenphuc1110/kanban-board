import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

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
