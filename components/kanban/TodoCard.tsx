"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Grip, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { isOverdue } from "@/lib/filters/todoFilters";
import { useTodoStore } from "@/lib/store/todoStore";
import { Badge } from "@/components/ui/Badge";
import { AddTodoModal } from "./AddTodoModal";
import type { TodoItem } from "@/lib/types";

interface TodoCardProps {
  todo: TodoItem;
  /**
   * When true, this instance is the floating DragOverlay clone.
   * We skip attaching the sortable ref and transform styles so the overlay
   * positions itself freely under the pointer rather than fighting the layout.
   */
  isDragOverlay?: boolean;
  /** Additional Tailwind classes forwarded from the parent (e.g. rotate/scale on overlay). */
  className?: string;
}

/**
 * A draggable Kanban card representing a single TodoItem.
 *
 * Key design decisions:
 * - Only the drag handle (<Grip> icon) receives dnd-kit listeners/attributes.
 *   This lets the user click elsewhere on the card to open the edit modal without
 *   accidentally triggering a drag. See decisions.md D10.
 * - When isDragging, the original card slot shows at opacity-30 while the DragOverlay
 *   clone floats freely. See decisions.md D11.
 * - Overdue cards get a coral border + shadow and an OVERDUE badge.
 */
export function TodoCard({ todo, isDragOverlay = false, className = "" }: TodoCardProps) {
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

  // Transform/transition are only applied to the actual sortable slot, not the overlay clone.
  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  // Overdue cards use the secondary (coral) color for border and shadow.
  const borderColor = overdue ? "border-secondary" : "border-foreground";
  const shadowClass = overdue
    ? "shadow-[4px_4px_0px_var(--secondary)]"
    : "shadow-[var(--shadow)]";

  return (
    <>
      <div
        ref={isDragOverlay ? undefined : setNodeRef}
        style={style}
        className={[
          "relative",
          "bg-surface",
          "border-[length:var(--border-width)]",
          borderColor,
          shadowClass,
          "p-3 flex flex-col gap-2",
          // The original slot fades while the overlay clone is being dragged.
          isDragging ? "opacity-30" : "opacity-100",
          "cursor-default",
          className,
        ].join(" ")}
      >
        {/* Overdue badge — pinned to the top-right of the card, partially overlapping the border */}
        {overdue && (
          <div className="absolute -top-[11px] right-2">
            <Badge label="OVERDUE" variant="overdue" />
          </div>
        )}

        {/* Drag handle + title row */}
        <div className="flex items-start gap-2">
          {/*
            Only the grip icon has dnd-kit listeners attached.
            This is critical: attaching listeners to the whole card would fire a drag
            on any click, preventing the edit modal from opening. See decisions.md D10.
          */}
          <button
            className="mt-0.5 cursor-grab active:cursor-grabbing text-foreground/40 hover:text-foreground flex-shrink-0"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <Grip size={14} />
          </button>

          {/* Clicking the title opens the edit modal */}
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 text-left text-sm font-bold text-foreground hover:underline"
          >
            {todo.title}
          </button>

          {/* Delete button */}
          <button
            onClick={() => deleteTodo(todo.id)}
            className="flex-shrink-0 text-foreground/40 hover:text-secondary transition-colors"
            aria-label="Delete todo"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Description preview — clamped to 2 lines */}
        {todo.description && (
          <p className="text-xs text-foreground/60 line-clamp-2 pl-5">
            {todo.description}
          </p>
        )}

        {/* Footer: priority badge, category badges, due date */}
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
                // Due date text turns coral when overdue
                overdue ? "text-secondary" : "text-foreground/60",
              ].join(" ")}
            >
              <Calendar size={11} />
              {format(new Date(todo.dueDate), "MMM d")}
            </span>
          )}
        </div>
      </div>

      {/* Edit modal — mounted only while open to keep state isolated */}
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
