import type { TodoItem } from "@/lib/types";

export async function syncLocalTodosToCloud(
  localTodos: TodoItem[]
): Promise<void> {
  const localOnly = localTodos.filter((t) => t.isLocalOnly);
  if (localOnly.length === 0) return;

  await fetch("/api/todos/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ todos: localOnly }),
  });
}

export async function fetchCloudTodos(): Promise<TodoItem[]> {
  const res = await fetch("/api/todos");
  if (!res.ok) return [];
  const data = await res.json();
  return data.todos ?? [];
}
