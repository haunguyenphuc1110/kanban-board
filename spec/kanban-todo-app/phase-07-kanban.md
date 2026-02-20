# Phase 7 — Kanban Board

## 7.1 Architecture

```
KanbanBoard (DndContext)
├── DragOverlay (floating clone during drag)
└── KanbanColumn × 3  (useDroppable per column)
    └── SortableContext
        └── TodoCard × N  (useSortable per card)

AddTodoModal  (portal, opens via store or keyboard shortcut)
FilterPanel   (priority chips + category chips)
```

### DnD Kit Component Roles

| Component | DnD Kit Hook | Purpose |
|-----------|-------------|---------|
| `KanbanBoard` | `DndContext` | Root drag context, handles `onDragEnd` |
| `KanbanColumn` | `useDroppable` | Each column is a drop target |
| `KanbanColumn` | `SortableContext` | Provides sort order context to children |
| `TodoCard` | `useSortable` | Each card is draggable and a drop target |

### Activation Strategy

Use `PointerSensor` with a minimum drag distance of 8px. This prevents a click on the card
(e.g. to open the edit modal) from accidentally triggering a drag.

```typescript
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

---

## 7.2 KanbanBoard (`components/kanban/KanbanBoard.tsx`)

```typescript
// components/kanban/KanbanBoard.tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { useTodoStore } from "@/lib/store/todoStore";
import { applyFilters } from "@/lib/filters/todoFilters";
import { KanbanColumn } from "./KanbanColumn";
import { TodoCard } from "./TodoCard";
import type { TodoItem, Status } from "@/lib/types";

const COLUMNS: { id: Status; label: string; headerColor: string }[] = [
  { id: "todo",        label: "To Do",       headerColor: "bg-primary" },
  { id: "in_progress", label: "In Progress",  headerColor: "bg-accent" },
  { id: "completed",   label: "Completed",    headerColor: "bg-success" },
];

export function KanbanBoard() {
  const { todos, filters, moveTodo, reorderTodosInColumn } = useTodoStore();
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredTodos = applyFilters(todos, filters);

  function getColumnTodos(status: Status): TodoItem[] {
    return filteredTodos
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart({ active }: DragStartEvent) {
    const todo = todos.find((t) => t.id === active.id);
    setActiveTodo(todo ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTodo(null);
    if (!over || !activeTodo) return;

    const overId = over.id as string;

    // Determine target column status
    const columnIds = COLUMNS.map((c) => c.id);
    const targetStatus: Status = columnIds.includes(overId as Status)
      ? (overId as Status)                         // dropped on column
      : (todos.find((t) => t.id === overId)?.status ?? activeTodo.status); // dropped on card

    const sourceStatus = activeTodo.status;

    if (sourceStatus !== targetStatus) {
      // Cross-column move: append to end of target column
      const targetTodos = getColumnTodos(targetStatus);
      moveTodo(activeTodo.id, targetStatus, targetTodos.length);
    } else {
      // Same-column reorder
      const columnTodos = getColumnTodos(sourceStatus);
      const oldIndex = columnTodos.findIndex((t) => t.id === active.id);
      const newIndex = columnTodos.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnTodos, oldIndex, newIndex);
        reorderTodosInColumn(sourceStatus, reordered.map((t) => t.id));
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            headerColor={col.headerColor}
            todos={getColumnTodos(col.id)}
          />
        ))}
      </div>

      {/* Floating clone shown while dragging */}
      <DragOverlay>
        {activeTodo ? (
          <TodoCard
            todo={activeTodo}
            isDragOverlay
            className="rotate-2 scale-105 opacity-90"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

---

## 7.3 KanbanColumn (`components/kanban/KanbanColumn.tsx`)

```typescript
// components/kanban/KanbanColumn.tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTodoStore } from "@/lib/store/todoStore";
import { TodoCard } from "./TodoCard";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import type { TodoItem, Status } from "@/lib/types";

interface Props {
  id: Status;
  label: string;
  headerColor: string;
  todos: TodoItem[];
}

export function KanbanColumn({ id, label, headerColor, todos }: Props) {
  const clearByStatus = useTodoStore((s) => s.clearByStatus);

  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={[
        "flex flex-col",
        "border-[length:var(--border-width)] border-foreground",
        "shadow-[var(--shadow)]",
        "min-h-[500px]",
        // Highlight column when a card is dragged over it
        isOver ? "bg-foreground/5" : "bg-background",
        "transition-colors duration-100",
      ].join(" ")}
    >
      {/* Column header */}
      <div
        className={[
          headerColor,
          "flex items-center justify-between",
          "border-b-[length:var(--border-width)] border-foreground",
          "px-4 py-3",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black uppercase tracking-wide">{label}</h2>
          <span className="border-[2px] border-foreground px-2 py-0.5 text-xs font-bold">
            {todos.length}
          </span>
        </div>
        {todos.length > 0 && (
          <button
            onClick={() => clearByStatus(id)}
            className="p-1 hover:bg-foreground/10 transition-colors"
            title={`Clear all ${label} todos`}
            aria-label={`Clear all ${label} todos`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Cards container */}
      <div ref={setNodeRef} className="flex flex-col gap-3 p-3 flex-1">
        <SortableContext
          items={todos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {todos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} />
          ))}
        </SortableContext>

        {todos.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-foreground/40 font-medium">Drop cards here</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 7.4 TodoCard (`components/kanban/TodoCard.tsx`)

### Overdue Styling

When `isOverdue(todo)` returns true:
- Border color: `var(--secondary)` (coral red) instead of `var(--foreground)`
- Box shadow: `4px 4px 0px var(--secondary)`
- An absolute-positioned `OVERDUE` badge at top of card

```typescript
// components/kanban/TodoCard.tsx
"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isOverdue } from "@/lib/filters/todoFilters";
import { Badge } from "@/components/ui/Badge";
import { AddTodoModal } from "./AddTodoModal";
import { useTodoStore } from "@/lib/store/todoStore";
import { Calendar, Grip, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { TodoItem } from "@/lib/types";

interface Props {
  todo: TodoItem;
  isDragOverlay?: boolean;
  className?: string;
}

export function TodoCard({ todo, isDragOverlay = false, className = "" }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);
  const overdue = isOverdue(todo);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Overdue styling overrides
  const borderColor    = overdue ? "border-secondary" : "border-foreground";
  const shadowStyle    = overdue
    ? "shadow-[4px_4px_0px_var(--secondary)]"
    : "shadow-[var(--shadow)]";

  return (
    <>
      <div
        ref={isDragOverlay ? undefined : setNodeRef}
        style={isDragOverlay ? undefined : style}
        className={[
          "relative",
          "bg-surface",
          "border-[length:var(--border-width)]",
          borderColor,
          shadowStyle,
          "p-3 flex flex-col gap-2",
          isDragging ? "opacity-30" : "opacity-100",
          "cursor-default",
          className,
        ].join(" ")}
      >
        {/* Overdue badge — absolute top-right */}
        {overdue && (
          <div className="absolute -top-[11px] right-2">
            <Badge label="OVERDUE" variant="overdue" />
          </div>
        )}

        {/* Drag handle + title row */}
        <div className="flex items-start gap-2">
          {/* Drag handle — only the grip icon initiates drag */}
          <button
            className="mt-0.5 cursor-grab active:cursor-grabbing text-foreground/40 hover:text-foreground flex-shrink-0"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <Grip size={14} />
          </button>

          {/* Title */}
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 text-left text-sm font-bold text-foreground hover:underline"
          >
            {todo.title}
          </button>

          {/* Delete */}
          <button
            onClick={() => deleteTodo(todo.id)}
            className="flex-shrink-0 text-foreground/40 hover:text-secondary transition-colors"
            aria-label="Delete todo"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Description preview */}
        {todo.description && (
          <p className="text-xs text-foreground/60 line-clamp-2 pl-5">
            {todo.description}
          </p>
        )}

        {/* Footer: due date + priority + categories */}
        <div className="flex flex-wrap items-center gap-1.5 pl-5">
          <Badge label={todo.priority} variant="priority" />

          {todo.categories.map((cat) => (
            <Badge
              key={cat.id}
              label={cat.name}
              backgroundColor={cat.color}
              variant="category"
            />
          ))}

          {todo.dueDate && (
            <span
              className={[
                "inline-flex items-center gap-1",
                "text-xs font-medium",
                overdue ? "text-secondary" : "text-foreground/60",
              ].join(" ")}
            >
              <Calendar size={11} />
              {format(new Date(todo.dueDate), "MMM d")}
            </span>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {isEditing && (
        <AddTodoModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          todo={todo}
        />
      )}
    </>
  );
}
```

---

## 7.5 AddTodoModal (`components/kanban/AddTodoModal.tsx`)

Handles both **create** (no `todo` prop) and **edit** (with `todo` prop) modes.

```typescript
// components/kanban/AddTodoModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useTodoStore } from "@/lib/store/todoStore";
import type { TodoItem, Priority, Status, Category } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  todo?: TodoItem;              // if provided, edit mode; otherwise create mode
  defaultStatus?: Status;       // pre-select column in create mode
}

export function AddTodoModal({ isOpen, onClose, todo, defaultStatus = "todo" }: Props) {
  const { todos, categories, addTodo, updateTodo } = useTodoStore();
  const isEditing = !!todo;

  const [title, setTitle]           = useState(todo?.title ?? "");
  const [description, setDesc]      = useState(todo?.description ?? "");
  const [priority, setPriority]     = useState<Priority>(todo?.priority ?? "medium");
  const [status, setStatus]         = useState<Status>(todo?.status ?? defaultStatus);
  const [dueDate, setDueDate]       = useState(
    todo?.dueDate ? todo.dueDate.slice(0, 10) : "" // "YYYY-MM-DD" for <input type="date">
  );
  const [selectedCats, setSelectedCats] = useState<string[]>(
    todo?.categories.map((c) => c.id) ?? []
  );
  const [error, setError]           = useState("");

  // Reset form when todo prop changes (e.g. opening different card)
  useEffect(() => {
    setTitle(todo?.title ?? "");
    setDesc(todo?.description ?? "");
    setPriority(todo?.priority ?? "medium");
    setStatus(todo?.status ?? defaultStatus);
    setDueDate(todo?.dueDate ? todo.dueDate.slice(0, 10) : "");
    setSelectedCats(todo?.categories.map((c) => c.id) ?? []);
    setError("");
  }, [todo, defaultStatus]);

  function toggleCategory(id: string) {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    const selectedCategories: Category[] = categories.filter((c) =>
      selectedCats.includes(c.id)
    );

    const columnTodos = todos.filter((t) => t.status === status);
    const position    = isEditing ? (todo?.position ?? 0) : columnTodos.length;

    if (isEditing && todo) {
      updateTodo(todo.id, {
        title:       title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate:     dueDate ? new Date(dueDate).toISOString() : undefined,
        position,
        categories:  selectedCategories,
      });
    } else {
      addTodo({
        title:       title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate:     dueDate ? new Date(dueDate).toISOString() : undefined,
        position,
        categories:  selectedCategories,
      });
    }

    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Todo" : "New Todo"}
      headerColor={isEditing ? "bg-accent" : "bg-primary"}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          error={error}
          placeholder="What needs to be done?"
          autoFocus
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Optional details..."
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </Select>
        </div>

        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {/* Category selection */}
        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide">Categories</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = selectedCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={[
                      "border-[2px] border-foreground px-2 py-0.5 text-xs font-bold",
                      "transition-all duration-75",
                      // Active: depressed style
                      active
                        ? "translate-x-[2px] translate-y-[2px] shadow-none"
                        : "shadow-[2px_2px_0px_var(--border-color)]",
                    ].join(" ")}
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="primary" size="md" onClick={handleSubmit} className="flex-1">
            {isEditing ? "Save Changes" : "Create Todo"}
          </Button>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## 7.6 FilterPanel (`components/kanban/FilterPanel.tsx`)

Priority chips and category chips. Active filters use a "depressed" Neo-Brutalism style
(translated position + shadow removed). The panel has `id="filter-panel"` for the `f` shortcut.

```typescript
// components/kanban/FilterPanel.tsx
"use client";

import { useTodoStore } from "@/lib/store/todoStore";
import { Button } from "@/components/ui/Button";
import type { Priority } from "@/lib/types";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export function FilterPanel() {
  const { filters, categories, setFilters, resetFilters } = useTodoStore();
  const hasActiveFilters =
    filters.priorities.length > 0 || filters.categoryIds.length > 0 || filters.searchQuery;

  function togglePriority(p: Priority) {
    const current = filters.priorities;
    setFilters({
      priorities: current.includes(p)
        ? current.filter((x) => x !== p)
        : [...current, p],
    });
  }

  function toggleCategory(id: string) {
    const current = filters.categoryIds;
    setFilters({
      categoryIds: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    });
  }

  return (
    <div
      id="filter-panel"
      className="flex flex-wrap items-center gap-3 py-3"
      tabIndex={-1}
    >
      <span className="text-sm font-black uppercase">Filter:</span>

      {/* Priority chips */}
      {PRIORITIES.map((p) => {
        const active = filters.priorities.includes(p);
        return (
          <button
            key={p}
            onClick={() => togglePriority(p)}
            className={[
              "border-[2px] border-foreground px-3 py-1 text-xs font-bold uppercase",
              "transition-all duration-75",
              active
                ? "translate-x-[2px] translate-y-[2px] shadow-none bg-foreground text-surface"
                : "shadow-[2px_2px_0px_var(--border-color)] bg-surface hover:shadow-[3px_3px_0px_var(--border-color)]",
            ].join(" ")}
          >
            {p}
          </button>
        );
      })}

      {/* Category chips */}
      {categories.map((cat) => {
        const active = filters.categoryIds.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={[
              "border-[2px] border-foreground px-3 py-1 text-xs font-bold",
              "transition-all duration-75",
              active
                ? "translate-x-[2px] translate-y-[2px] shadow-none"
                : "shadow-[2px_2px_0px_var(--border-color)] hover:shadow-[3px_3px_0px_var(--border-color)]",
            ].join(" ")}
            style={{ backgroundColor: cat.color }}
          >
            {cat.name}
          </button>
        );
      })}

      {/* Search input */}
      <input
        type="text"
        value={filters.searchQuery}
        onChange={(e) => setFilters({ searchQuery: e.target.value })}
        placeholder="Search..."
        className={[
          "border-[2px] border-foreground bg-surface px-2 py-1 text-sm",
          "outline-none shadow-[2px_2px_0px_var(--border-color)]",
          "focus:shadow-[3px_3px_0px_var(--border-color)]",
          "w-32",
        ].join(" ")}
      />

      {/* Reset button */}
      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="text-xs font-bold text-secondary underline hover:no-underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
```
