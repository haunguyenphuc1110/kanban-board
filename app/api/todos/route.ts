import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todos, todoCategories, categories } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

/**
 * GET /api/todos
 *
 * Returns all todos belonging to the authenticated user, each enriched with
 * their associated categories. Results are ordered by (status, position) so
 * that kanban columns remain stable across fetches.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch every todo that belongs to this user, ordered for stable column display.
  const userTodos = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, session.user.id))
    .orderBy(asc(todos.status), asc(todos.position));

  // Build a map of todoId → categories so we can attach them in a single
  // extra query instead of N+1 individual lookups.
  const categoryMap: Record<string, { id: string; name: string; color: string }[]> = {};

  const todoIds = userTodos.map((t) => t.id);

  if (todoIds.length > 0) {
    const associations = await db
      .select({
        todoId: todoCategories.todoId,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(todoCategories)
      .innerJoin(categories, eq(todoCategories.categoryId, categories.id))
      .where(inArray(todoCategories.todoId, todoIds));

    for (const { todoId, categoryId, categoryName, categoryColor } of associations) {
      if (!categoryMap[todoId]) {
        categoryMap[todoId] = [];
      }
      categoryMap[todoId].push({
        id: categoryId,
        name: categoryName,
        color: categoryColor,
      });
    }
  }

  // Shape each row into the TodoItem interface expected by the client.
  // Dates are serialised as ISO strings; isLocalOnly is always false for
  // server-sourced records.
  const result = userTodos.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate?.toISOString() ?? undefined,
    position: t.position,
    categories: categoryMap[t.id] ?? [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    isLocalOnly: false as const,
  }));

  return NextResponse.json({ todos: result });
}

/**
 * POST /api/todos
 *
 * Creates a new todo for the authenticated user.
 *
 * Body: { title, description?, priority?, status?, dueDate?, categoryIds?, position? }
 *
 * Returns 201 with the created todo shaped to match TodoItem.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    title,
    description,
    priority = "medium",
    status = "todo",
    dueDate,
    categoryIds = [],
    position = 0,
  } = body as {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    categoryIds?: string[];
    position?: number;
  };

  // title is the only required field.
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const [newTodo] = await db
    .insert(todos)
    .values({
      userId: session.user.id,
      title: title.trim(),
      description: description ?? null,
      // Cast through unknown to satisfy the pgEnum branded type while still
      // accepting the raw string values the client sends.
      priority: priority as "low" | "medium" | "high" | "urgent",
      status: status as "todo" | "in_progress" | "completed",
      dueDate: dueDate ? new Date(dueDate) : null,
      position: typeof position === "number" ? position : 0,
    })
    .returning();

  // Associate the new todo with any supplied categories.
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    await db.insert(todoCategories).values(
      categoryIds.map((categoryId: string) => ({
        todoId: newTodo.id,
        categoryId,
      }))
    );
  }

  return NextResponse.json(
    {
      todo: {
        id: newTodo.id,
        title: newTodo.title,
        description: newTodo.description ?? undefined,
        priority: newTodo.priority,
        status: newTodo.status,
        dueDate: newTodo.dueDate?.toISOString() ?? undefined,
        position: newTodo.position,
        categories: [],
        createdAt: newTodo.createdAt.toISOString(),
        updatedAt: newTodo.updatedAt.toISOString(),
        isLocalOnly: false as const,
      },
    },
    { status: 201 }
  );
}
