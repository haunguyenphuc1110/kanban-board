export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "todo" | "in_progress" | "completed";

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string; // ISO string
  position: number;
  categories: Category[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isLocalOnly?: boolean; // true for unsynced guest todos
}

export interface Filters {
  priorities: Priority[];
  categoryIds: string[];
  searchQuery: string;
}

export type ViewMode = "kanban" | "calendar";

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  dueDate?: string;
  categoryIds?: string[];
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  dueDate?: string | null;
  position?: number;
  categoryIds?: string[];
}
