import type { TodoItem, Category } from "@/lib/types";

const TODOS_KEY = "kanban_todos";
const CATEGORIES_KEY = "kanban_categories";

export const localStorageManager = {
  getTodos(): TodoItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(TODOS_KEY);
      return raw ? JSON.parse(raw) : [];
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
      return raw ? JSON.parse(raw) : [];
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
