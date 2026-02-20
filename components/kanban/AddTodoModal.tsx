"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useTodoStore } from "@/lib/store/todoStore";
import type { TodoItem, Priority, Status, Category } from "@/lib/types";

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal operates in edit mode rather than create mode. */
  todo?: TodoItem;
  /** Pre-selects a column in create mode. Defaults to "todo". */
  defaultStatus?: Status;
}

/**
 * Modal form for creating or editing a TodoItem.
 *
 * Create mode: no `todo` prop — calls addTodo on submit.
 * Edit mode:   `todo` prop provided — calls updateTodo on submit.
 *
 * The form resets whenever the `todo` prop reference changes, which handles the
 * case where the user opens different cards without unmounting the modal.
 */
export function AddTodoModal({
  isOpen,
  onClose,
  todo,
  defaultStatus = "todo",
}: AddTodoModalProps) {
  const { todos, categories, addTodo, updateTodo } = useTodoStore();
  const isEditing = !!todo;

  const [title, setTitle]             = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [priority, setPriority]       = useState<Priority>(todo?.priority ?? "medium");
  const [status, setStatus]           = useState<Status>(todo?.status ?? defaultStatus);
  // Date input expects "YYYY-MM-DD"; dueDate is stored as a full ISO string.
  const [dueDate, setDueDate]         = useState(
    todo?.dueDate ? todo.dueDate.slice(0, 10) : ""
  );
  const [selectedCats, setSelectedCats] = useState<string[]>(
    todo?.categories.map((c) => c.id) ?? []
  );
  const [error, setError] = useState("");

  // Keep the form in sync with whichever todo is being edited.
  // This handles rapid switching between cards without remounting the component.
  useEffect(() => {
    setTitle(todo?.title ?? "");
    setDescription(todo?.description ?? "");
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

    // Resolve selected category ids back to full Category objects.
    const selectedCategories: Category[] = categories.filter((c) =>
      selectedCats.includes(c.id)
    );

    if (isEditing && todo) {
      updateTodo(todo.id, {
        title:       title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate:     dueDate ? new Date(dueDate).toISOString() : undefined,
        // Preserve position when editing; it changes only on drag-and-drop.
        position:    todo.position,
        categories:  selectedCategories,
      });
    } else {
      // Append to end of the target column by using its current length as position.
      const columnTodos = todos.filter((t) => t.status === status);
      addTodo({
        title:       title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate:     dueDate ? new Date(dueDate).toISOString() : undefined,
        position:    columnTodos.length,
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
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          error={error}
          placeholder="What needs to be done?"
          autoFocus
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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

        {/* Category multi-select as chip buttons */}
        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide">Categories</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = selectedCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={[
                      "border-[2px] border-foreground px-2 py-0.5 text-xs font-bold",
                      "transition-all duration-75",
                      // Active state: "depressed" Neo-Brutalism press effect
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

        {/* Form actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            className="flex-1"
          >
            {isEditing ? "Save Changes" : "Create Todo"}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
