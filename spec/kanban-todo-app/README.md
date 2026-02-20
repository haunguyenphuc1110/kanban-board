# Kanban Todo App — Implementation Spec

## Overview

A full-featured Kanban board todo application built on Next.js 16 with Neo-Brutalism design.
The app supports both **guest users** (localStorage, no account required) and **authenticated users** (Neon PostgreSQL via Drizzle ORM). Data syncs from local storage to the cloud on sign-in.

**Live features:**
- 3-column Kanban board (To Do / In Progress / Completed) with drag-and-drop
- Calendar view (day / week / month) for todos with due dates
- Priority and category filtering
- Overdue card highlighting
- Single-key keyboard shortcuts
- Email/password authentication via Better Auth
- Guest → authenticated data sync

---

## Tech Stack

| Concern          | Library / Tool                                        | Version      |
|------------------|-------------------------------------------------------|--------------|
| Framework        | Next.js (App Router)                                  | 16.1.6       |
| UI               | React                                                 | 19.2.3       |
| Styling          | Tailwind CSS v4                                       | ^4           |
| Database         | Neon PostgreSQL (`@neondatabase/serverless`)          | ^1.0.2       |
| ORM              | Drizzle ORM (`drizzle-orm`)                           | ^0.45.1      |
| DB Migrations    | Drizzle Kit (`drizzle-kit`)                           | ^0.31.9      |
| Authentication   | Better Auth (`better-auth`)                           | ^1.4.18      |
| Drag & Drop      | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | ^6/^10/^3 |
| Calendar         | `react-big-calendar` + `date-fns` localizer           | ^1.19.4 / ^4 |
| Global State     | Zustand (`zustand`)                                   | ^5.0.11      |
| Icons            | `lucide-react`                                        | ^0.575.0     |
| Type Defs        | `@types/react-big-calendar`                           | ^1.16.3      |

---

## Complete File Tree

```
app/
  page.tsx                         ← Main Kanban board page
  layout.tsx                       ← Root layout (metadata update only)
  globals.css                      ← Neo-Brutalism theme (DO NOT CHANGE)
  api/
    auth/[...all]/route.ts         ← Better Auth catch-all
    todos/
      route.ts                     ← GET (list) + POST (create)
      [id]/route.ts                ← PUT (update) + DELETE
      sync/route.ts                ← POST (bulk guest sync)
  (auth)/
    sign-in/page.tsx
    sign-up/page.tsx
  calendar/page.tsx

lib/
  auth.ts                          ← Better Auth server instance
  auth-client.ts                   ← Better Auth React/browser client
  types.ts                         ← All shared TypeScript types
  db/
    index.ts                       ← Neon + Drizzle connection singleton
    schema.ts                      ← All DB table definitions
  store/
    todoStore.ts                   ← Zustand store (dual-mode)
  storage/
    localStorageManager.ts         ← Raw localStorage helpers
    syncManager.ts                 ← Cloud push/pull helpers
  filters/
    todoFilters.ts                 ← applyFilters(), isOverdue()

components/
  kanban/
    KanbanBoard.tsx                ← DndContext root
    KanbanColumn.tsx               ← Droppable column + SortableContext
    TodoCard.tsx                   ← Sortable card with overdue styling
    AddTodoModal.tsx               ← Create / edit modal form
    FilterPanel.tsx                ← Priority + category chip filters
  calendar/
    CalendarView.tsx               ← react-big-calendar wrapper
  auth/
    UserMenu.tsx                   ← Session display + sign-out
  layout/
    Header.tsx                     ← App header + nav
    KeyboardShortcutsHelp.tsx      ← ? overlay
  ui/
    Button.tsx
    Input.tsx
    Modal.tsx
    Badge.tsx

hooks/
  useKeyboardShortcuts.ts

drizzle.config.ts                  ← Drizzle Kit project config
middleware.ts                      ← Minimal Next.js middleware (no hard redirects)
.env.local                         ← Environment variables (not committed)
```

---

## Document Index

| File | Covers |
|------|--------|
| [phase-01-setup.md](./phase-01-setup.md) | Environment, packages, env vars, Neo-Brutalism CSS |
| [phase-02-database.md](./phase-02-database.md) | Drizzle schema, Neon connection, migrations |
| [phase-03-auth.md](./phase-03-auth.md) | Better Auth config, API handler, client |
| [phase-04-types-state.md](./phase-04-types-state.md) | Types, Zustand store, storage, filters |
| [phase-05-api-routes.md](./phase-05-api-routes.md) | All `/api/todos` route implementations |
| [phase-06-ui-primitives.md](./phase-06-ui-primitives.md) | Button, Input, Modal, Badge components |
| [phase-07-kanban.md](./phase-07-kanban.md) | Board, columns, cards, drag-and-drop, filter panel |
| [phase-08-calendar.md](./phase-08-calendar.md) | Calendar view with react-big-calendar |
| [phase-09-pages.md](./phase-09-pages.md) | Main page, auth pages, header, keyboard shortcuts |
| [decisions.md](./decisions.md) | Architecture decisions and gotchas reference |

---

## Implementation Order

Execute phases strictly in this order — earlier phases define types and primitives consumed by later ones.

```
Phase 1  → Environment setup + package installation
Phase 2  → Database schema + Drizzle config + Neon connection
Phase 3  → Better Auth server + client + API handler
Phase 4  → Shared types + Zustand store + storage + filters
Phase 5  → API routes (todos CRUD + sync)
Phase 6  → UI primitives (Button, Input, Modal, Badge)
Phase 7  → Kanban components (Board, Column, Card, Modal, FilterPanel)
Phase 8  → Calendar view
Phase 9  → Layout, header, auth pages, main page, keyboard shortcuts
Phase 10 → Cleanup (delete boilerplate SVGs, update layout.tsx metadata)
```

---

## Verification Checklist

- [ ] `npm run dev` starts without TypeScript errors
- [ ] `npm run db:migrate` creates all tables in Neon
- [ ] Guest flow: add/edit/delete/drag todos → persists across page refresh (localStorage)
- [ ] Sign up creates user row in `user` table
- [ ] Sign in syncs localStorage todos → cloud todos visible after page refresh
- [ ] Sign out → todos remain available from localStorage
- [ ] Drag card between columns → `status` and `position` update
- [ ] Drag card within column → `position` reorders correctly
- [ ] Overdue card (past dueDate, status ≠ completed) shows red border + OVERDUE badge
- [ ] Calendar view shows todos with due dates; month/week/day toggle works
- [ ] Priority and category filters apply in both kanban and calendar views
- [ ] Keyboard shortcuts: `n`, `k`, `b`, `c`, `f`, `?`, `Escape` all fire correctly
- [ ] Keyboard shortcuts do NOT fire when typing in input/textarea/select
- [ ] `npm run build` succeeds with no TypeScript errors
