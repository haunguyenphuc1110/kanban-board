# Phase 9 — Pages & Layout

## 9.1 Keyboard Shortcuts Hook (`hooks/useKeyboardShortcuts.ts`)

Single-key shortcuts that do not fire when the user is focused on an input element.

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShortcutHandlers {
  onNewTodo: () => void;
  onToggleHelp: () => void;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useKeyboardShortcuts({ onNewTodo, onToggleHelp }: ShortcutHandlers) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if modifier keys are held (don't override browser shortcuts)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Skip if focus is on an interactive element
      const target = e.target as HTMLElement;
      if (
        INPUT_TAGS.has(target.tagName) ||
        target.contentEditable === "true"
      ) {
        return;
      }

      switch (e.key) {
        case "n":
          e.preventDefault();
          onNewTodo();
          break;

        case "k":
        case "b":
          e.preventDefault();
          router.push("/");
          break;

        case "c":
          e.preventDefault();
          router.push("/calendar");
          break;

        case "f":
          e.preventDefault();
          document.getElementById("filter-panel")?.focus();
          break;

        case "?":
          e.preventDefault();
          onToggleHelp();
          break;

        case "Escape":
          // Modal components handle their own Escape key via useEffect.
          // This is a safety net for cases where no modal is open.
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, onNewTodo, onToggleHelp]);
}
```

**Shortcut table:**

| Key | Action |
|-----|--------|
| `n` | Open new todo modal |
| `k` or `b` | Navigate to Kanban board (`/`) |
| `c` | Navigate to Calendar (`/calendar`) |
| `f` | Focus `#filter-panel` element |
| `?` | Toggle keyboard shortcuts help overlay |
| `Escape` | Close open modal (handled per-modal) |

---

## 9.2 UserMenu (`components/auth/UserMenu.tsx`)

```typescript
// components/auth/UserMenu.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useTodoStore } from "@/lib/store/todoStore";
import { Button } from "@/components/ui/Button";
import { LogOut, User } from "lucide-react";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const signOutAndKeepLocal = useTodoStore((s) => s.signOutAndKeepLocal);

  if (isPending) {
    return (
      <div className="h-9 w-24 border-[length:var(--border-width)] border-foreground bg-surface animate-pulse" />
    );
  }

  if (!session) {
    return (
      <div className="flex gap-2">
        <Link href="/sign-in">
          <Button variant="ghost" size="sm">Sign In</Button>
        </Link>
        <Link href="/sign-up">
          <Button variant="primary" size="sm">Sign Up</Button>
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    signOutAndKeepLocal();  // Mark todos as local-only before clearing session
    await signOut();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 border-[length:var(--border-width)] border-foreground px-3 py-1.5 bg-surface">
        <User size={14} />
        <span className="text-sm font-bold max-w-[160px] truncate">
          {session.user.email}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1 text-sm font-bold text-secondary hover:underline"
        title="Sign out"
      >
        <LogOut size={14} />
        Sign Out
      </button>
    </div>
  );
}
```

---

## 9.3 KeyboardShortcutsHelp (`components/layout/KeyboardShortcutsHelp.tsx`)

```typescript
// components/layout/KeyboardShortcutsHelp.tsx
"use client";

import { Modal } from "@/components/ui/Modal";

const SHORTCUTS = [
  { key: "n",      action: "New todo" },
  { key: "k / b",  action: "Kanban view" },
  { key: "c",      action: "Calendar view" },
  { key: "f",      action: "Focus filter panel" },
  { key: "?",      action: "Show this help" },
  { key: "Escape", action: "Close modal" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" headerColor="bg-accent">
      <table className="w-full text-sm">
        <tbody>
          {SHORTCUTS.map(({ key, action }) => (
            <tr
              key={key}
              className="border-b-[2px] border-foreground/20 last:border-b-0"
            >
              <td className="py-2 pr-6">
                <kbd className="border-[2px] border-foreground bg-surface px-2 py-0.5 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--border-color)]">
                  {key}
                </kbd>
              </td>
              <td className="py-2 text-foreground/80">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
```

---

## 9.4 Header (`components/layout/Header.tsx`)

```typescript
// components/layout/Header.tsx
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
    { href: "/",          label: "Board",    icon: LayoutGrid,  view: "kanban" as const },
    { href: "/calendar",  label: "Calendar", icon: Calendar,    view: "calendar" as const },
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
          {/* Keyboard help */}
          <button
            onClick={onToggleHelp}
            className="border-[2px] border-foreground p-1.5 hover:bg-foreground/10 transition-colors"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>

          {/* New todo */}
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
```

---

## 9.5 Main Page (`app/page.tsx`)

This is the root kanban view. It wires up:
1. Zustand store hydration from localStorage
2. Better Auth session → store auth state sync
3. Keyboard shortcuts
4. Modals (new todo + keyboard help)
5. KanbanBoard + FilterPanel

```typescript
// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useTodoStore } from "@/lib/store/todoStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { FilterPanel } from "@/components/kanban/FilterPanel";
import { AddTodoModal } from "@/components/kanban/AddTodoModal";
import { Header } from "@/components/layout/Header";
import { KeyboardShortcutsHelp } from "@/components/layout/KeyboardShortcutsHelp";

export default function Home() {
  const { data: session } = useSession();
  const { setAuthenticated, signInAndSync, todos } = useTodoStore();
  const [isNewTodoOpen, setIsNewTodoOpen]   = useState(false);
  const [isHelpOpen, setIsHelpOpen]         = useState(false);

  // Step 1: Rehydrate Zustand store from localStorage on mount
  useEffect(() => {
    useTodoStore.persist.rehydrate();
  }, []);

  // Step 2: Sync Better Auth session into store
  useEffect(() => {
    const isAuth = !!session?.user;
    setAuthenticated(isAuth);

    // If we just became authenticated and have unsynced local todos, sync them
    if (isAuth) {
      const hasLocalOnly = todos.some((t) => t.isLocalOnly);
      if (hasLocalOnly) {
        signInAndSync();
      }
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: excluding setAuthenticated and signInAndSync from deps is intentional —
  // they're stable store actions that don't need to trigger re-runs.

  // Step 3: Register keyboard shortcuts
  useKeyboardShortcuts({
    onNewTodo:    () => setIsNewTodoOpen(true),
    onToggleHelp: () => setIsHelpOpen((v) => !v),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentView="kanban"
        onNewTodo={() => setIsNewTodoOpen(true)}
        onToggleHelp={() => setIsHelpOpen((v) => !v)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <FilterPanel />
        <KanbanBoard />
      </main>

      <AddTodoModal
        isOpen={isNewTodoOpen}
        onClose={() => setIsNewTodoOpen(false)}
      />

      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
```

---

## 9.6 Sign-In Page (`app/(auth)/sign-in/page.tsx`)

The `(auth)` route group creates a visual grouping without affecting URLs.
Sign-in URL is `/sign-in`.

```typescript
// app/(auth)/sign-in/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { useTodoStore } from "@/lib/store/todoStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  const router = useRouter();
  const signInAndSync = useTodoStore((s) => s.signInAndSync);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Sign in failed. Check your credentials.");
      setLoading(false);
      return;
    }

    // Sync local todos to cloud, then redirect
    await signInAndSync();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md border-[length:var(--border-width)] border-foreground shadow-[8px_8px_0px_var(--border-color)]">
        {/* Header bar */}
        <div className="bg-primary border-b-[length:var(--border-width)] border-foreground px-6 py-4">
          <h1 className="text-2xl font-black uppercase">Sign In</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface p-6 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm font-bold text-secondary border-[2px] border-secondary bg-secondary/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <p className="text-sm text-center text-foreground/70">
            No account?{" "}
            <Link href="/sign-up" className="font-bold underline hover:no-underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

---

## 9.7 Sign-Up Page (`app/(auth)/sign-up/page.tsx`)

```typescript
// app/(auth)/sign-up/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signUp.email({ name, email, password });

    if (result.error) {
      setError(result.error.message ?? "Sign up failed. Please try again.");
      setLoading(false);
      return;
    }

    // Redirect to home; session is set automatically
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md border-[length:var(--border-width)] border-foreground shadow-[8px_8px_0px_var(--border-color)]">
        <div className="bg-success border-b-[length:var(--border-width)] border-foreground px-6 py-4">
          <h1 className="text-2xl font-black uppercase">Create Account</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface p-6 flex flex-col gap-4">
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            autoComplete="name"
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm font-bold text-secondary border-[2px] border-secondary bg-secondary/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>

          <p className="text-sm text-center text-foreground/70">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-bold underline hover:no-underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

---

## 9.8 layout.tsx Update

Only change the `metadata` export. Do not touch fonts, body, or structure.

```typescript
// app/layout.tsx — only update this section
export const metadata: Metadata = {
  title: "Kanban Board",
  description: "A Neo-Brutalism Kanban todo app with drag-and-drop, calendar view, and cloud sync.",
};
```

---

## 9.9 Directory Creation Commands

```bash
mkdir -p app/\(auth\)/sign-in
mkdir -p app/\(auth\)/sign-up
mkdir -p app/calendar
mkdir -p components/kanban
mkdir -p components/calendar
mkdir -p components/auth
mkdir -p components/layout
mkdir -p components/ui
mkdir -p hooks
```
