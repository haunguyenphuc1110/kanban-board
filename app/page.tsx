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
  const [isNewTodoOpen, setIsNewTodoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Rehydrate Zustand store from localStorage on mount (SSR safety)
  useEffect(() => {
    useTodoStore.persist.rehydrate();
  }, []);

  // Sync Better Auth session into the store whenever session changes
  useEffect(() => {
    const isAuth = !!session?.user;
    setAuthenticated(isAuth);

    // If we just became authenticated and have unsynced local todos, sync them
    if (isAuth) {
      const { todos } = useTodoStore.getState();
      if (todos.some((t) => t.isLocalOnly)) signInAndSync();
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: excluding setAuthenticated and signInAndSync from deps is intentional —
  // they are stable store actions that do not need to trigger re-runs.

  // Register single-key keyboard shortcuts
  useKeyboardShortcuts({
    onNewTodo: () => setIsNewTodoOpen(true),
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

      {isNewTodoOpen && (
        <AddTodoModal onClose={() => setIsNewTodoOpen(false)} />
      )}

      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
