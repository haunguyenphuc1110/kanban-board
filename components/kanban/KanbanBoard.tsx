"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { useTodoStore } from "@/lib/store/todoStore";
import { applyFilters } from "@/lib/filters/todoFilters";
import { KanbanColumn } from "./KanbanColumn";
import { TodoCard } from "./TodoCard";
import type { TodoItem, Status } from "@/lib/types";

/** Column definitions for the three Kanban swimlanes. */
const COLUMNS: { id: Status; label: string; headerColor: string }[] = [
  { id: "todo",        label: "To Do",      headerColor: "bg-primary" },
  { id: "in_progress", label: "In Progress", headerColor: "bg-accent" },
  { id: "completed",   label: "Completed",   headerColor: "bg-success" },
];

const COLUMN_IDS = COLUMNS.map((c) => c.id) as string[];

/**
 * Root Kanban board component.
 *
 * Owns the DnD context and is responsible for:
 * - Tracking which card is being dragged (for the DragOverlay clone)
 * - Resolving the target column on drag end
 * - Dispatching moveTodo (cross-column) or reorderTodosInColumn (same-column) to the store
 */
export function KanbanBoard() {
  const { todos, filters, moveTodo, reorderTodosInColumn } = useTodoStore();
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null);

  // 8px activation distance prevents clicks from triggering drag operations.
  // See decisions.md D10.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** Returns the sorted, filtered todos for a given column. */
  function getColumnTodos(status: Status): TodoItem[] {
    return applyFilters(todos, filters)
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart({ active }: DragStartEvent) {
    // Look up in the unfiltered store so dragging a filtered-out card still works.
    const todo = todos.find((t) => t.id === active.id);
    setActiveTodo(todo ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTodo(null);
    if (!over || !activeTodo) return;

    const overId = over.id as string;

    // Determine which column the card was dropped onto.
    // If overId is a column id, use it directly; otherwise find the column that owns the card.
    const targetStatus: Status = COLUMN_IDS.includes(overId)
      ? (overId as Status)
      : (todos.find((t) => t.id === overId)?.status ?? activeTodo.status);

    const sourceStatus = activeTodo.status;

    if (sourceStatus !== targetStatus) {
      // Cross-column: append to the end of the target column.
      const targetColumnTodos = getColumnTodos(targetStatus);
      moveTodo(activeTodo.id, targetStatus, targetColumnTodos.length);
    } else {
      // Same-column: reorder within the column.
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

      {/*
        DragOverlay renders a floating clone of the card while dragging.
        The original card slot stays visible at reduced opacity (handled in TodoCard).
        rotate-2 / scale-105 give a "picked up" tactile feel. See decisions.md D11.
      */}
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
