# Phase 4 — Types, State, Storage, Filters

## 4.1 Shared TypeScript Types (`lib/types.ts`)

All types shared between client and server. Import from `"@/lib/types"` everywhere.

```typescript
// lib/types.ts

export type Priority = "low" | "medium" | "high" | "urgent";
export type Status   = "todo" | "in_progress" | "completed";

export interface Category {
  id: string;
  name: string;
  color: string; // hex string, e.g. "#FF4D4D"
}

export interface TodoItem {
  id: string;            // uuid (cloud) or crypto.randomUUID() (local)
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string;      // ISO 8601 string, e.g. "2025-06-15T00:00:00.000Z"
  position: number;      // sort order within its status column
  categories: Category[];
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  isLocalOnly?: boolean; // true = not yet synced to cloud; false/undefined = cloud-synced
}

export interface Filters {
  priorities: Priority[];    // empty = show all
  categoryIds: string[];     // empty = show all
  searchQuery: string;       // empty = show all
}

export type ViewMode = "kanban" | "calendar";

// API input shapes
export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  dueDate?: string;
  categoryIds?: string[];
  position?: number;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  dueDate?: string | null; // null to remove due date
  position?: number;
  categoryIds?: string[];
}
```

---

## 4.2 Filter Utilities (`lib/filters/todoFilters.ts`)

```typescript
// lib/filters/todoFilters.ts
import type { TodoItem, Filters } from "@/lib/types";

/**
 * Returns true if the todo is past its due date and not yet completed.
 * Used to apply overdue styling in TodoCard and CalendarView.
 */
export function isOverdue(todo: TodoItem): boolean {
  if (!todo.dueDate) return false;
  if (todo.status === "completed") return false;
  return new Date(todo.dueDate) < new Date();
}

/**
 * Applies all active filters to a list of todos.
 * - Priority filter: OR logic (todo matches any selected priority)
 * - Category filter: OR logic (todo matches any selected category)
 * - Search query: case-insensitive substring match on title and description
 * - Empty filter arrays = no filtering applied for that dimension
 */
export function applyFilters(todos: TodoItem[], filters: Filters): TodoItem[] {
  return todos.filter((todo) => {
    // Search query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const inTitle = todo.title.toLowerCase().includes(q);
      const inDesc  = todo.description?.toLowerCase().includes(q) ?? false;
      if (!inTitle && !inDesc) return false;
    }

    // Priority filter (OR)
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(todo.priority)) return false;
    }

    // Category filter (OR)
    if (filters.categoryIds.length > 0) {
      const todoCatIds = todo.categories.map((c) => c.id);
      const hasMatch = filters.categoryIds.some((id) => todoCatIds.includes(id));
      if (!hasMatch) return false;
    }

    return true;
  });
}
```

---

## 4.3 LocalStorage Manager (`lib/storage/localStorageManager.ts`)

Thin wrapper around `localStorage` with SSR guard (returns empty arrays during server rendering).

```typescript
// lib/storage/localStorageManager.ts
import type { TodoItem, Category } from "@/lib/types";

const TODOS_KEY      = "kanban_todos";
const CATEGORIES_KEY = "kanban_categories";

export const localStorageManager = {
  getTodos(): TodoItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(TODOS_KEY);
      return raw ? (JSON.parse(raw) as TodoItem[]) : [];
    } catch {
      return [];
    }
  },

  setTodos(todos: TodoItem[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
  },

  getCategories(): Category[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      return raw ? (JSON.parse(raw) as Category[]) : [];
    } catch {
      return [];
    }
  },

  setCategories(categories: Category[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TODOS_KEY);
    localStorage.removeItem(CATEGORIES_KEY);
  },
};
```

> **Note:** The Zustand `persist` middleware (with `createJSONStorage(() => localStorage)`) handles
> automatic read/write for the store. `localStorageManager` is used only for direct access outside
> the store context (e.g. reading todos before the store is mounted).

---

## 4.4 Sync Manager (`lib/storage/syncManager.ts`)

Used by `store.signInAndSync()` to push local-only todos to the cloud and pull the cloud state.

```typescript
// lib/storage/syncManager.ts
import type { TodoItem } from "@/lib/types";

/**
 * Sends all isLocalOnly todos to the sync endpoint.
 * The API upserts them with the authenticated user's ID.
 */
export async function syncLocalTodosToCloud(
  localTodos: TodoItem[]
): Promise<void> {
  const localOnly = localTodos.filter((t) => t.isLocalOnly);
  if (localOnly.length === 0) return;

  const res = await fetch("/api/todos/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ todos: localOnly }),
  });
  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status}`);
  }
}

/**
 * Fetches the full list of cloud todos for the authenticated user.
 * Returns an empty array if the request fails.
 */
export async function fetchCloudTodos(): Promise<TodoItem[]> {
  const res = await fetch("/api/todos");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.todos as TodoItem[]) ?? [];
}
```

---

## 4.5 Zustand Store (`lib/store/todoStore.ts`)

### Architecture Overview

The store is the single source of truth for all UI state. It operates in two modes:

| Mode | `isAuthenticated` | Write behavior |
|------|------------------|----------------|
| Guest | `false` | Writes to localStorage only |
| Authenticated | `true` | Optimistic local update + fire-and-forget API call |

All mutations are **optimistic** — the UI updates immediately, then the API call fires in the
background. If the API call fails, the UI shows stale data until the next reload. This is
acceptable for the current iteration; a retry mechanism can be added later.

### SSR / Hydration Strategy

Zustand's `persist` middleware reads from `localStorage` which doesn't exist during SSR.
Setting `skipHydration: true` prevents the store from reading localStorage during SSR.
`useTodoStore.persist.rehydrate()` must be called inside a `useEffect` on the root page
to populate the store from localStorage after the component mounts.

### `partialize` (What Gets Persisted)

Only serialize what should survive across page refreshes:
- ✅ `todos` — the actual todo data
- ✅ `categories` — user's category definitions
- ✅ `filters` — last-applied filter state
- ❌ `isAuthenticated` — re-derived from Better Auth session on mount
- ❌ `isSyncing` — ephemeral loading flag

### Full Implementation

```typescript
// lib/store/todoStore.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TodoItem, Category, Filters, Status } from "@/lib/types";
import {
  syncLocalTodosToCloud,
  fetchCloudTodos,
} from "@/lib/storage/syncManager";

interface TodoState {
  todos: TodoItem[];
  categories: Category[];
  filters: Filters;
  isAuthenticated: boolean;
  isSyncing: boolean;

  // CRUD
  addTodo: (
    input: Omit<TodoItem, "id" | "createdAt" | "updatedAt" | "isLocalOnly">
  ) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;

  // Drag and Drop
  moveTodo: (id: string, newStatus: Status, newPosition: number) => void;
  reorderTodosInColumn: (status: Status, orderedIds: string[]) => void;

  // Bulk operations
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

      // ── CRUD ────────────────────────────────────────────────────────────────

      addTodo: (input) => {
        const now = new Date().toISOString();
        const todo: TodoItem = {
          ...input,
          id: crypto.randomUUID(),   // client-generated UUID; replaced by server ID after sync
          createdAt: now,
          updatedAt: now,
          isLocalOnly: !get().isAuthenticated,
        };

        // Optimistic update
        set((s) => ({ todos: [...s.todos, todo] }));

        // Fire API if authenticated
        if (get().isAuthenticated) {
          fetch("/api/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title:       todo.title,
              description: todo.description,
              priority:    todo.priority,
              status:      todo.status,
              dueDate:     todo.dueDate,
              categoryIds: todo.categories.map((c) => c.id),
              position:    todo.position,
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              // Replace the client-generated UUID with the server-assigned UUID
              if (data.todo?.id) {
                set((s) => ({
                  todos: s.todos.map((t) =>
                    t.id === todo.id ? { ...t, id: data.todo.id, isLocalOnly: false } : t
                  ),
                }));
              }
            })
            .catch(() => {}); // Silent fail — todo still exists locally
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

      // ── Drag & Drop ─────────────────────────────────────────────────────────

      moveTodo: (id, newStatus, newPosition) => {
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status:    newStatus,
                  position:  newPosition,
                  updatedAt: new Date().toISOString(),
                }
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
        set((s) => ({
          todos: s.todos.map((t) => {
            if (t.status !== status) return t;
            const idx = orderedIds.indexOf(t.id);
            return idx === -1 ? t : { ...t, position: idx, updatedAt: new Date().toISOString() };
          }),
        }));

        if (get().isAuthenticated) {
          // Update each todo's position in the background
          orderedIds.forEach((id, position) => {
            fetch(`/api/todos/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position }),
            }).catch(() => {});
          });
        }
      },

      // ── Bulk ────────────────────────────────────────────────────────────────

      clearAll: () => {
        if (get().isAuthenticated) {
          // Delete all authenticated user's todos via API
          get().todos.forEach((t) => {
            fetch(`/api/todos/${t.id}`, { method: "DELETE" }).catch(() => {});
          });
        }
        set({ todos: [] });
      },

      clearByStatus: (status) => {
        if (get().isAuthenticated) {
          get()
            .todos.filter((t) => t.status === status)
            .forEach((t) => {
              fetch(`/api/todos/${t.id}`, { method: "DELETE" }).catch(() => {});
            });
        }
        set((s) => ({ todos: s.todos.filter((t) => t.status !== status) }));
      },

      // ── Filters ─────────────────────────────────────────────────────────────

      setFilters: (filters) =>
        set((s) => ({ filters: { ...s.filters, ...filters } })),

      resetFilters: () => set({ filters: defaultFilters }),

      // ── Auth Lifecycle ───────────────────────────────────────────────────────

      setAuthenticated: (val) => set({ isAuthenticated: val }),

      signInAndSync: async () => {
        set({ isSyncing: true });
        try {
          const { todos } = get();
          // 1. Push unsynced local todos to the cloud
          await syncLocalTodosToCloud(todos);
          // 2. Fetch the full cloud state (includes just-synced todos)
          const cloudTodos = await fetchCloudTodos();
          // 3. Replace the local store with cloud state
          set({ todos: cloudTodos, isAuthenticated: true, isSyncing: false });
        } catch {
          // Even on failure, mark as authenticated (local data preserved)
          set({ isAuthenticated: true, isSyncing: false });
        }
      },

      signOutAndKeepLocal: () => {
        // Mark all todos as local-only so they aren't accidentally deleted
        set((s) => ({
          isAuthenticated: false,
          todos: s.todos.map((t) => ({ ...t, isLocalOnly: true })),
        }));
      },

      // ── Categories ──────────────────────────────────────────────────────────

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
      skipHydration: true,           // Prevent SSR localStorage access
      partialize: (state) => ({      // Only persist these keys
        todos:      state.todos,
        categories: state.categories,
        filters:    state.filters,
        // isAuthenticated and isSyncing are NOT persisted
      }),
    }
  )
);
```

### Selector Patterns

Use fine-grained selectors to prevent unnecessary re-renders:

```typescript
// Get todos for a specific column
const columnTodos = useTodoStore((s) =>
  s.todos
    .filter((t) => t.status === "todo")
    .sort((a, b) => a.position - b.position)
);

// Get filtered todos for kanban
const { todos, filters } = useTodoStore((s) => ({
  todos: s.todos,
  filters: s.filters,
}));
const filteredTodos = applyFilters(todos, filters);
```
