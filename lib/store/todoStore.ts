"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TodoItem, Category, Filters, Status } from "@/lib/types";
import { syncLocalTodosToCloud, fetchCloudTodos } from "@/lib/storage/syncManager";

interface TodoState {
  todos: TodoItem[];
  categories: Category[];
  filters: Filters;
  isAuthenticated: boolean;
  isSyncing: boolean;

  // CRUD
  addTodo: (input: Omit<TodoItem, "id" | "createdAt" | "updatedAt" | "isLocalOnly">) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;

  // Drag and Drop
  moveTodo: (id: string, newStatus: Status, newPosition: number) => void;
  reorderTodosInColumn: (status: Status, orderedIds: string[]) => void;

  // Bulk
  clearAll: () => void;
  clearByStatus: (status: Status) => void;

  // Filters
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;

  // Auth lifecycle
  setAuthenticated: (val: boolean) => void;
  signInAndSync: () => Promise<void>;
  signOutAndKeepLocal: () => void;

  // Categories
  addCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
}

const defaultFilters: Filters = {
  priorities: [],
  categoryIds: [],
  searchQuery: "",
};

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      categories: [],
      filters: defaultFilters,
      isAuthenticated: false,
      isSyncing: false,

      addTodo: (input) => {
        const now = new Date().toISOString();
        const todo: TodoItem = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          isLocalOnly: !get().isAuthenticated,
        };

        set((s) => ({ todos: [...s.todos, todo] }));

        if (get().isAuthenticated) {
          fetch("/api/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: todo.title,
              description: todo.description,
              priority: todo.priority,
              status: todo.status,
              dueDate: todo.dueDate,
              categoryIds: todo.categories.map((c) => c.id),
              position: todo.position,
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.todo) {
                set((s) => ({
                  todos: s.todos.map((t) =>
                    t.id === todo.id ? { ...t, id: data.todo.id } : t
                  ),
                }));
              }
            })
            .catch(() => {});
        }
      },

      updateTodo: (id, updates) => {
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));

        if (get().isAuthenticated) {
          fetch(`/api/todos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }).catch(() => {});
        }
      },

      deleteTodo: (id) => {
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));

        if (get().isAuthenticated) {
          fetch(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {});
        }
      },

      moveTodo: (id, newStatus, newPosition) => {
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id
              ? { ...t, status: newStatus, position: newPosition, updatedAt: new Date().toISOString() }
              : t
          ),
        }));

        if (get().isAuthenticated) {
          fetch(`/api/todos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus, position: newPosition }),
          }).catch(() => {});
        }
      },

      reorderTodosInColumn: (status, orderedIds) => {
        set((s) => {
          const updated = s.todos.map((t) => {
            if (t.status !== status) return t;
            const idx = orderedIds.indexOf(t.id);
            if (idx === -1) return t;
            return { ...t, position: idx, updatedAt: new Date().toISOString() };
          });
          return { todos: updated };
        });

        if (get().isAuthenticated) {
          orderedIds.forEach((id, position) => {
            fetch(`/api/todos/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position }),
            }).catch(() => {});
          });
        }
      },

      clearAll: () => set({ todos: [] }),

      clearByStatus: (status) =>
        set((s) => ({ todos: s.todos.filter((t) => t.status !== status) })),

      setFilters: (filters) =>
        set((s) => ({ filters: { ...s.filters, ...filters } })),

      resetFilters: () => set({ filters: defaultFilters }),

      setAuthenticated: (val) => set({ isAuthenticated: val }),

      signInAndSync: async () => {
        set({ isSyncing: true });
        try {
          const { todos } = get();
          await syncLocalTodosToCloud(todos);
          const cloudTodos = await fetchCloudTodos();
          set({ todos: cloudTodos, isAuthenticated: true, isSyncing: false });
        } catch {
          set({ isSyncing: false });
        }
      },

      signOutAndKeepLocal: () => {
        set((s) => ({
          isAuthenticated: false,
          // Keep only todos that were never synced to cloud.
          // After sign-in and sync all cloud todos have isLocalOnly: false,
          // so this effectively clears the board for the next guest session.
          todos: s.todos.filter((t) => t.isLocalOnly === true),
        }));
      },

      addCategory: (category) =>
        set((s) => ({ categories: [...s.categories, category] })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          todos: s.todos.map((t) => ({
            ...t,
            categories: t.categories.filter((c) => c.id !== id),
          })),
        })),
    }),
    {
      name: "kanban-store",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        todos: state.todos,
        categories: state.categories,
        filters: state.filters,
        // Exclude: isAuthenticated, isSyncing (ephemeral)
      }),
    }
  )
);
