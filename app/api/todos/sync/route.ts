import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import type { TodoItem } from "@/lib/types";

/**
 * POST /api/todos/sync
 *
 * Bulk-upserts guest todos into the cloud, assigning them to the authenticated
 * user. This endpoint is designed to be called once immediately after sign-in
 * to migrate todos that were created in guest mode (stored in localStorage)
 * into the database.
 *
 * Idempotency: `onConflictDoUpdate` ensures that calling this endpoint
 * multiple times (e.g. after a failed network request or a second sign-in)
 * never produces duplicate rows or errors. If a todo UUID already exists in
 * the database it will simply have its userId refreshed to the current user
 * and its updatedAt timestamp bumped.
 *
 * Body:  { todos: TodoItem[] }
 * Returns: { synced: number }
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { todos?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Guard: body.todos must be an array; an empty array is a valid no-op.
  if (!Array.isArray(body.todos)) {
    return NextResponse.json({ error: "todos must be an array" }, { status: 400 });
  }

  const localTodos = body.todos as TodoItem[];

  if (localTodos.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  // Upsert all local todos in a single statement.
  // - INSERT assigns the authenticated user's id.
  // - ON CONFLICT (id) updates userId and updatedAt, making the operation
  //   safe to repeat any number of times without duplicate-key errors.
  await db
    .insert(todos)
    .values(
      localTodos.map((t) => ({
        id: t.id,
        userId: session.user.id,
        title: t.title,
        description: t.description ?? null,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        position: t.position,
        // Preserve the original timestamps so the user's data history is
        // maintained after migration rather than all appearing created "now".
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      }))
    )
    .onConflictDoUpdate({
      target: todos.id,
      set: {
        // Re-assign ownership (covers the case where the id existed under a
        // different or null userId) and bump the timestamp to signal the sync.
        userId: session.user.id,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ synced: localTodos.length });
}
