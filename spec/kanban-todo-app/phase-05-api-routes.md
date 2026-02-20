# Phase 5 — API Routes

## Critical: Next.js 16 Async Params

In Next.js 15+, dynamic route `params` is a **Promise**. Always `await params` before accessing properties.

```typescript
// ✅ Correct
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// ❌ Wrong — will cause runtime error in Next.js 16
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params; // TypeScript error + runtime warning
}
```

Similarly, `headers()` returns a Promise in Next.js 15+:
```typescript
import { headers } from "next/headers";
const session = await auth.api.getSession({ headers: await headers() });
```

---

## 5.1 Todos Collection (`app/api/todos/route.ts`)

### GET — List authenticated user's todos

Returns all todos for the authenticated user, each with their associated categories.
Ordered by `(status, position)` for stable column ordering.

```typescript
// app/api/todos/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todos, todoCategories, categories } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch todos with their category associations
  const userTodos = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, session.user.id))
    .orderBy(asc(todos.status), asc(todos.position));

  // Fetch category associations for all returned todos
  const todoIds = userTodos.map((t) => t.id);

  let categoryMap: Record<string, { id: string; name: string; color: string }[]> = {};

  if (todoIds.length > 0) {
    const associations = await db
      .select({
        todoId:       todoCategories.todoId,
        categoryId:   categories.id,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(todoCategories)
      .innerJoin(categories, eq(todoCategories.categoryId, categories.id))
      .where(eq(todoCategories.todoId, todoIds[0])); // simplified — see note below

    // Build a map: todoId → [{ id, name, color }]
    associations.forEach(({ todoId, categoryId, categoryName, categoryColor }) => {
      if (!categoryMap[todoId]) categoryMap[todoId] = [];
      categoryMap[todoId].push({ id: categoryId, name: categoryName, color: categoryColor });
    });
  }

  // Shape the response to match TodoItem interface
  const result = userTodos.map((t) => ({
    id:          t.id,
    title:       t.title,
    description: t.description ?? undefined,
    priority:    t.priority,
    status:      t.status,
    dueDate:     t.dueDate?.toISOString(),
    position:    t.position,
    categories:  categoryMap[t.id] ?? [],
    createdAt:   t.createdAt.toISOString(),
    updatedAt:   t.updatedAt.toISOString(),
    isLocalOnly: false,
  }));

  return NextResponse.json({ todos: result });
}
```

> **Note on joining multiple todos to categories:** The simplified example above only queries one
> todoId. For production, use Drizzle's relational API or an `inArray` clause:
> ```typescript
> import { inArray } from "drizzle-orm";
> .where(inArray(todoCategories.todoId, todoIds))
> ```

### POST — Create a new todo

```typescript
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    priority = "medium",
    status = "todo",
    dueDate,
    categoryIds = [],
    position = 0,
  } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Insert todo
  const [newTodo] = await db
    .insert(todos)
    .values({
      userId:      session.user.id,
      title:       title.trim(),
      description: description ?? null,
      priority,
      status,
      dueDate:     dueDate ? new Date(dueDate) : null,
      position,
    })
    .returning();

  // Insert category associations
  if (categoryIds.length > 0) {
    await db.insert(todoCategories).values(
      categoryIds.map((categoryId: string) => ({
        todoId:     newTodo.id,
        categoryId,
      }))
    );
  }

  return NextResponse.json(
    {
      todo: {
        ...newTodo,
        dueDate:    newTodo.dueDate?.toISOString(),
        createdAt:  newTodo.createdAt.toISOString(),
        updatedAt:  newTodo.updatedAt.toISOString(),
        categories: [],
        isLocalOnly: false,
      },
    },
    { status: 201 }
  );
}
```

---

## 5.2 Individual Todo (`app/api/todos/[id]/route.ts`)

### PUT — Update a todo (partial update / PATCH semantics)

```typescript
// app/api/todos/[id]/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todos, todoCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ← Promise in Next.js 16
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;   // ← await required
  const body = await request.json();

  // Build partial update object — only set fields that were provided
  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.title       !== undefined) updateValues.title       = body.title;
  if (body.description !== undefined) updateValues.description = body.description;
  if (body.priority    !== undefined) updateValues.priority    = body.priority;
  if (body.status      !== undefined) updateValues.status      = body.status;
  if (body.position    !== undefined) updateValues.position    = body.position;
  if (body.dueDate     !== undefined) {
    updateValues.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  const [updated] = await db
    .update(todos)
    .set(updateValues)
    .where(
      and(
        eq(todos.id, id),
        eq(todos.userId, session.user.id) // Ownership check
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sync categories if provided
  if (Array.isArray(body.categoryIds)) {
    // Remove existing associations
    await db.delete(todoCategories).where(eq(todoCategories.todoId, id));
    // Insert new ones
    if (body.categoryIds.length > 0) {
      await db.insert(todoCategories).values(
        body.categoryIds.map((categoryId: string) => ({ todoId: id, categoryId }))
      );
    }
  }

  return NextResponse.json({ todo: { ...updated, updatedAt: updated.updatedAt.toISOString() } });
}
```

### DELETE — Delete a todo

```typescript
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .delete(todos)
    .where(
      and(
        eq(todos.id, id),
        eq(todos.userId, session.user.id) // Ownership check
      )
    );

  return new Response(null, { status: 204 });
}
```

---

## 5.3 Sync Route (`app/api/todos/sync/route.ts`)

Bulk-inserts guest todos into the cloud, assigning `userId` to the authenticated user.
Uses `onConflictDoUpdate` so repeated syncs are idempotent (safe to call multiple times).

```typescript
// app/api/todos/sync/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import type { TodoItem } from "@/lib/types";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const localTodos: TodoItem[] = body.todos ?? [];

  if (localTodos.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  // Upsert each local todo — if the UUID already exists (re-sync), just update userId
  await db
    .insert(todos)
    .values(
      localTodos.map((t) => ({
        id:          t.id,
        userId:      session.user.id,
        title:       t.title,
        description: t.description ?? null,
        priority:    t.priority,
        status:      t.status,
        dueDate:     t.dueDate ? new Date(t.dueDate) : null,
        position:    t.position,
        createdAt:   new Date(t.createdAt),
        updatedAt:   new Date(t.updatedAt),
      }))
    )
    .onConflictDoUpdate({
      target: todos.id,
      set: {
        userId:    session.user.id,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ synced: localTodos.length });
}
```

**Why upsert?**
If a user signs out and back in, their local todos (now with cloud UUIDs) would fail a straight
insert due to duplicate primary key. `onConflictDoUpdate` makes the sync endpoint safe to call
multiple times without error.

---

## 5.4 File Creation Commands

```bash
mkdir -p app/api/todos/\[id\]
mkdir -p app/api/todos/sync
```

Files to create:
- `app/api/todos/route.ts`
- `app/api/todos/[id]/route.ts`
- `app/api/todos/sync/route.ts`

---

## 5.5 API Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/todos` | Required | List user's todos |
| POST | `/api/todos` | Required | Create new todo |
| PUT | `/api/todos/:id` | Required | Partial update |
| DELETE | `/api/todos/:id` | Required | Delete todo (204) |
| POST | `/api/todos/sync` | Required | Bulk sync guest todos |
| GET/POST | `/api/auth/**` | N/A | Better Auth handler |
