"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/Button";
import { LayoutGrid, Calendar, Plus, Keyboard } from "lucide-react";

interface Props {
  onNewTodo?: () => void;
  onToggleHelp?: () => void;
  currentView?: "kanban" | "calendar";
}

export function Header({ onNewTodo, onToggleHelp, currentView = "kanban" }: Props) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/",         label: "Board",    icon: LayoutGrid, view: "kanban" as const },
    { href: "/calendar", label: "Calendar", icon: Calendar,   view: "calendar" as const },
  ];

  return (
    <header className="border-b-[length:var(--border-width)] border-foreground bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl font-black uppercase tracking-tight text-foreground hover:text-foreground/70 transition-colors"
        >
          Kanban Board
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon, view }) => {
            const isActive = view === currentView || pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-1.5",
                  "border-[2px] border-transparent px-3 py-1.5 text-sm font-bold",
                  "transition-all duration-75",
                  isActive
                    ? "border-foreground bg-primary shadow-[2px_2px_0px_var(--border-color)]"
                    : "hover:border-foreground hover:bg-foreground/5",
                ].join(" ")}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Keyboard shortcuts help button */}
          <button
            onClick={onToggleHelp}
            className="border-[2px] border-foreground p-1.5 hover:bg-foreground/10 transition-colors"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>

          {/* New todo button — only rendered when a handler is provided */}
          {onNewTodo && (
            <Button variant="primary" size="sm" onClick={onNewTodo}>
              <Plus size={14} className="mr-1 inline" />
              New Todo
            </Button>
          )}

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
