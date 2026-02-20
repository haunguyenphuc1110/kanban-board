# Architecture Decisions & Gotchas

This document captures every non-obvious decision made during the design of this application,
along with the reasoning behind it. Developers should read this before starting implementation.

---

## D1 — `user.id` Must Be `text`, NOT `uuid`

**Decision:** `user.id` in the Drizzle schema is `text`, not `uuid`.

**Why:** Better Auth generates its own user IDs using nanoid — a URL-safe alphanumeric format
(e.g., `"kx9p2m4r"`) that is NOT a valid UUID. If you define `user.id` as `uuid`, PostgreSQL
will reject the value at insert time with a "invalid input syntax for type uuid" error.

**Impact:** Every foreign key that references `user.id` must also be `text`:
- `session.userId: text`
- `account.userId: text`
- `todos.userId: text` (nullable)
- `categories.userId: text`

---

## D2 — `todos.userId` Is Nullable

**Decision:** `todos.userId` allows NULL values.

**Why:** Guest users create todos without an account. These todos are stored in localStorage
client-side, but during the sign-in sync flow, they need to be inserted into the database.
At the moment of insert, they don't yet have a `userId` — the assignment happens in the same
upsert. Making the column nullable avoids a two-phase insert (insert without userId, then update).

**How it works at sync time:**
```sql
INSERT INTO todos (id, user_id, ...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id
```

This is safe because the sync endpoint always receives an authenticated session before
inserting, so `userId` is always set correctly in practice.

---

## D3 — Optimistic UI Updates with Fire-and-Forget API Calls

**Decision:** All mutations update the Zustand store immediately (optimistically), then fire
an API call in the background without awaiting it.

**Why:** This makes the UI feel instant. For a single-user todo app, eventual consistency
between local state and the server is acceptable. Todos are not financial transactions.

**Trade-off:** If the API call fails (e.g., network error), the local state and server diverge.
The user will see stale data until they refresh. This is a known limitation of the current
design. Future improvement: add error recovery or retry logic.

**Implementation:** Every mutation in `todoStore.ts` follows this pattern:
```typescript
// 1. Update local state immediately
set((s) => ({ todos: updateLogic(s.todos) }));

// 2. Fire API in background (no await, no error shown to user)
if (get().isAuthenticated) {
  fetch("/api/todos/...", { ... }).catch(() => {});
}
```

---

## D4 — Zustand `skipHydration` + Manual `rehydrate()`

**Decision:** Use `skipHydration: true` in Zustand persist config and call
`useTodoStore.persist.rehydrate()` in a `useEffect` on the root page.

**Why:** Next.js renders pages on the server (SSR) before sending them to the browser.
During SSR, `localStorage` doesn't exist. Without `skipHydration`, Zustand's persist
middleware would throw on the server, or silently return empty state and cause a hydration
mismatch when the browser renders with different data.

**The pattern:**
```typescript
// app/page.tsx
useEffect(() => {
  useTodoStore.persist.rehydrate();
}, []); // Empty deps: runs once on mount (client-only)
```

This means the first server render always shows an empty board (no flash of incorrect content),
and then the client immediately populates it from localStorage after mount. This is correct
behavior for a guest-mode-first app.

---

## D5 — `isAuthenticated` and `isSyncing` Are NOT Persisted

**Decision:** The `partialize` function in Zustand persist excludes `isAuthenticated` and `isSyncing`.

**Why:** `isAuthenticated` is derived from the Better Auth session, not from localStorage.
If we persisted it, a user could appear "authenticated" in the store even if their session
expired (e.g., after 7 days). Deriving it fresh from `useSession()` on every mount is correct.

`isSyncing` is a transient loading flag. Persisting it would cause the UI to show a
permanently-loading state after a crash during sync.

**How `isAuthenticated` gets set:**
```typescript
// app/page.tsx
const { data: session } = useSession(); // Better Auth hook
useEffect(() => {
  setAuthenticated(!!session?.user);
}, [session]);
```

---

## D6 — `crypto.randomUUID()` for Client-Side IDs

**Decision:** Use `crypto.randomUUID()` (browser built-in) instead of the `uuid` npm package.

**Why:** Avoids an extra dependency. `crypto.randomUUID()` is available in all modern browsers
and in Node.js 19+. It generates RFC 4122 v4 UUIDs, which are compatible with PostgreSQL's
`uuid` column type.

**Caveat:** The client-generated UUID is temporary. After the todo is created server-side
(for authenticated users), the store replaces the local UUID with the server-assigned UUID:
```typescript
.then((data) => {
  if (data.todo?.id) {
    set((s) => ({
      todos: s.todos.map((t) =>
        t.id === todo.id ? { ...t, id: data.todo.id } : t
      ),
    }));
  }
})
```

---

## D7 — `await params` in Next.js 16 Dynamic Routes

**Decision:** Always `await params` before accessing its properties in dynamic route handlers.

**Why:** In Next.js 15+, `params` in route handlers and page components is a `Promise<{...}>`,
not a plain object. This is a breaking change from Next.js 14. Not awaiting it is a TypeScript
error and may produce `undefined` values at runtime.

```typescript
// ✅ Correct
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Must await
}
```

---

## D8 — `await headers()` in Route Handlers

**Decision:** Always `await headers()` before passing to `auth.api.getSession()`.

**Why:** In Next.js 15+, `headers()` from `"next/headers"` returns a Promise. Better Auth's
`getSession` expects the resolved `Headers` object, not a Promise.

```typescript
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

---

## D9 — react-big-calendar CSS in a Client Component

**Decision:** Import `react-big-calendar/lib/css/react-big-calendar.css` inside `CalendarView.tsx`
which is marked `"use client"`.

**Why:** In Next.js App Router, CSS file imports only work in client components. If you try to
import the CSS in a server component, the build will fail with an error about non-JS modules.

**Implication:** `CalendarView` cannot be a server component. This is fine — it relies on
client state (`useTodoStore`) anyway.

---

## D10 — DnD Kit Activation Constraint (8px distance)

**Decision:** Use `PointerSensor` with `activationConstraint: { distance: 8 }`.

**Why:** Without a minimum drag distance, any click on a card would trigger a drag operation.
The user couldn't click the card to open the edit modal without accidentally starting a drag.
8px is a comfortable threshold — small enough to feel responsive, large enough to distinguish
an intentional drag from a click.

```typescript
useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
```

---

## D11 — DragOverlay for Ghost Card

**Decision:** Use `DragOverlay` from `@dnd-kit/core` to render a floating "ghost" clone of the
card while dragging.

**Why:** Without `DragOverlay`, the card disappears from its original position during drag,
causing layout shifts in the column. With `DragOverlay`, the original slot shows at reduced
opacity (`opacity-30`) while a transformed clone floats under the cursor.

The clone is rendered with `rotate-2 scale-105 opacity-90` to give a visual "picked up" effect.

---

## D12 — No Hard Auth Redirects in Middleware

**Decision:** `middleware.ts` does not redirect unauthenticated users away from any route.

**Why:** The app is designed to be fully usable without authentication (guest mode).
Redirecting unauthenticated users to `/sign-in` would break the guest experience.
All routes are accessible to everyone. Authentication is opt-in for cloud sync only.

The middleware file exists only as a structural placeholder.

---

## D13 — Filter OR Logic

**Decision:** When multiple priorities are selected, show todos matching ANY selected priority
(OR, not AND). Same for categories.

**Why:** Strict AND filtering would be too restrictive. If a user selects "high" and "urgent",
they want to see all important todos, not only todos that are simultaneously both.

**Example:**
- Selected priorities: `["high", "urgent"]`
- Shows todos where `priority === "high"` OR `priority === "urgent"`

---

## D14 — Sync Idempotency via `onConflictDoUpdate`

**Decision:** The sync endpoint uses `INSERT ... ON CONFLICT (id) DO UPDATE SET user_id = ...`
instead of a plain `INSERT`.

**Why:** If a user signs out and back in (or if the sync fails partway), re-running the sync
would fail with a duplicate key error on a plain `INSERT`. Using upsert makes the operation
safe to repeat any number of times.

---

## D15 — `isLocalOnly` Flag on TodoItem

**Decision:** `TodoItem` has an `isLocalOnly?: boolean` field in the client-side type.

**Why:** During sync, we need to distinguish which todos have already been written to the
cloud and which are still only in localStorage. Storing this on the todo itself (rather than
a separate set of IDs) makes the check simple: `todos.filter((t) => t.isLocalOnly)`.

After a successful API creation, the store sets `isLocalOnly: false` on the corresponding todo.

---

## D16 — `account.password` Column Required for Email Auth

**Decision:** The `account` table in the Drizzle schema includes a `password` field.

**Why:** Better Auth's email/password plugin stores the hashed password in the `account` table
(not the `user` table). If this column is missing, sign-up will fail at the database level.
The column is nullable (not all OAuth accounts will have a password).

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|-----------------|
| `user.id: uuid` | `user.id: text` |
| `params.id` without await | `const { id } = await params` |
| `headers()` without await | `await headers()` |
| Importing rbc CSS in server component | Import only in `"use client"` component |
| `crypto.randomUUID()` in Node < 19 | Fine for Next.js 16 (Node 20+) |
| Hardcoding `#1A1A1A` for borders | Use `var(--border-color)` or `border-foreground` |
| Hardcoding `4px 4px 0px #1A1A1A` for shadows | Use `var(--shadow)` |
| Committing `.env.local` | Add to `.gitignore` |
| Using moment.js with react-big-calendar | Use `date-fns` localizer |
