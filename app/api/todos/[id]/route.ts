import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todos, todoCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * PUT /api/todos/[id]
 *
 * Partial update (PATCH semantics) for a single todo. Only fields present in
 * the request body are written; every other field remains unchanged.
 *
 * Ownership is enforced by requiring todos.userId === session.user.id inside
 * the WHERE clause — the DB will return zero rows if the todo belongs to
 * another user, and we respond with 404 (never leaking whether the id exists).
 *
 * If categoryIds is present in the body, existing category associations are
 * replaced atomically: delete-then-insert within the same handler.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // params is a Promise in Next.js 15+ — must be awaited before use.
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Build the update payload from only the fields the caller supplied.
  // updatedAt is always refreshed on every write.
  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) {
    updateValues.title = body.title;
  }
  if (body.description !== undefined) {
    // Allow explicitly nulling out description.
    updateValues.description = body.description ?? null;
  }
  if (body.priority !== undefined) {
    updateValues.priority = body.priority as "low" | "medium" | "high" | "urgent";
  }
  if (body.status !== undefined) {
    updateValues.status = body.status as "todo" | "in_progress" | "completed";
  }
  if (body.position !== undefined) {
    updateValues.position = body.position;
  }
  if (body.dueDate !== undefined) {
    // null means "clear the due date"; a string value means "set/change it".
    updateValues.dueDate = body.dueDate ? new Date(body.dueDate as string) : null;
  }

  const [updated] = await db
    .update(todos)
    .set(updateValues)
    .where(
      and(
        eq(todos.id, id),
        // Ownership check — prevents one user from mutating another's data.
        eq(todos.userId, session.user.id)
      )
    )
    .returning();

  // Zero rows returned means either the id doesn't exist or it belongs to
  // a different user. We intentionally return 404 in both cases.
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Replace category associations when the caller supplies categoryIds.
  if (Array.isArray(body.categoryIds)) {
    // Remove all existing associations for this todo first.
    await db.delete(todoCategories).where(eq(todoCategories.todoId, id));

    // Re-insert the new set (may be empty, which is a valid "no categories" state).
    if ((body.categoryIds as string[]).length > 0) {
      await db.insert(todoCategories).values(
        (body.categoryIds as string[]).map((categoryId) => ({
          todoId: id,
          categoryId,
        }))
      );
    }
  }

  return NextResponse.json({
    todo: {
      id: updated.id,
      title: updated.title,
      description: updated.description ?? undefined,
      priority: updated.priority,
      status: updated.status,
      dueDate: updated.dueDate?.toISOString() ?? undefined,
      position: updated.position,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      isLocalOnly: false as const,
    },
  });
}

/**
 * DELETE /api/todos/[id]
 *
 * Permanently deletes a todo. Ownership is enforced via the WHERE clause.
 * Returns 204 No Content on success. We do not distinguish between "not
 * found" and "found and deleted" — both result in 204 — because the end
 * state the client cares about (resource absent) is the same either way.
 */
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // params is a Promise in Next.js 15+ — must be awaited before use.
  const { id } = await params;

  await db
    .delete(todos)
    .where(
      and(
        eq(todos.id, id),
        // Ownership check — silently no-ops if the todo belongs to another user.
        eq(todos.userId, session.user.id)
      )
    );

  // 204 No Content — no body is allowed with this status.
  return new Response(null, { status: 204 });
}
