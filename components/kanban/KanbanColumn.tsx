"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Trash2 } from "lucide-react";
import { useTodoStore } from "@/lib/store/todoStore";
import { TodoCard } from "./TodoCard";
import type { TodoItem, Status } from "@/lib/types";

interface KanbanColumnProps {
  /** The column's status identifier, also used as the droppable id. */
  id: Status;
  /** Human-readable column heading (e.g. "To Do"). */
  label: string;
  /** Tailwind bg-* class applied to the column header bar. */
  headerColor: string;
  /** Pre-filtered and pre-sorted todos to display in this column. */
  todos: TodoItem[];
}

/**
 * A single Kanban swimlane column.
 *
 * Responsibilities:
 * - Registers as a droppable target via useDroppable (column id = status string)
 * - Wraps cards in SortableContext for intra-column reordering
 * - Highlights when a card is dragged over it
 * - Provides a "clear all" action for the column
 */
export function KanbanColumn({ id, label, headerColor, todos }: KanbanColumnProps) {
  const clearByStatus = useTodoStore((s) => s.clearByStatus);

  // useDroppable registers this column as a valid drop zone.
  // isOver is true when a dragged card hovers over this column.
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={[
        "flex flex-col",
        "border-[length:var(--border-width)] border-foreground",
        "shadow-[var(--shadow)]",
        "min-h-[500px]",
        // Subtle background highlight when a card is dragged over this column
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
          {/* Card count badge */}
          <span className="border-[2px] border-foreground px-2 py-0.5 text-xs font-bold">
            {todos.length}
          </span>
        </div>

        {/* Trash button: only shown when there are cards to clear */}
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

      {/* Cards drop zone — ref must be on the scrollable content area */}
      <div ref={setNodeRef} className="flex flex-col gap-3 p-3 flex-1">
        <SortableContext
          items={todos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {todos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} />
          ))}
        </SortableContext>

        {/* Empty state placeholder — shown when the column has no cards */}
        {todos.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-foreground/40 font-medium">Drop cards here</p>
          </div>
        )}
      </div>
    </div>
  );
}
