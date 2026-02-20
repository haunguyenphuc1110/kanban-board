import type { TodoItem, Filters } from "@/lib/types";

export function isOverdue(todo: TodoItem): boolean {
  if (!todo.dueDate) return false;
  if (todo.status === "completed") return false;
  return new Date(todo.dueDate) < new Date();
}

export function applyFilters(todos: TodoItem[], filters: Filters): TodoItem[] {
  return todos.filter((todo) => {
    // Search query filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matches =
        todo.title.toLowerCase().includes(q) ||
        (todo.description?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;
    }

    // Priority filter (OR logic — show if matches any selected priority)
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(todo.priority)) return false;
    }

    // Category filter (OR logic — show if matches any selected category)
    if (filters.categoryIds.length > 0) {
      const todoCategoryIds = todo.categories.map((c) => c.id);
      const hasMatch = filters.categoryIds.some((id) =>
        todoCategoryIds.includes(id)
      );
      if (!hasMatch) return false;
    }

    return true;
  });
}
