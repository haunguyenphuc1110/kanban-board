"use client";

// CSS must be imported in a client component — this is the primary reason for "use client"
import "react-big-calendar/lib/css/react-big-calendar.css";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useTodoStore } from "@/lib/store/todoStore";
import { applyFilters, isOverdue } from "@/lib/filters/todoFilters";
import type { TodoItem } from "@/lib/types";

// ── date-fns localizer (Sunday as week start) ────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
});

// ── Priority → event background color ────────────────────────────────────────
// Hex values are required here — rbc applies these via inline style, not Tailwind.
const PRIORITY_COLORS: Record<string, string> = {
  low:    "#AAFF00", // --success
  medium: "#00D4FF", // --accent
  high:   "#FFE500", // --primary
  urgent: "#FF4D4D", // --secondary
};

// ── Calendar event shape ─────────────────────────────────────────────────────
interface CalEvent {
  id:    string;
  title: string;
  start: Date;
  end:   Date;
  todo:  TodoItem;
}

export function CalendarView() {
  const { todos, filters } = useTodoStore();
  const [view, setView]    = useState<View>("month");
  const [date, setDate]    = useState(new Date());

  // Only include todos that have a due date and are not yet completed.
  // Apply active filters first so the calendar respects the same filter
  // state used by the kanban board.
  const calTodos = useMemo(() => {
    const filtered = applyFilters(todos, filters);
    return filtered.filter((t) => t.dueDate && t.status !== "completed");
  }, [todos, filters]);

  // Map each qualifying todo to a rbc CalEvent. start === end so the event
  // renders as an all-day point-in-time marker on the due date.
  const events: CalEvent[] = useMemo(
    () =>
      calTodos.map((t) => ({
        id:    t.id,
        title: t.title,
        start: new Date(t.dueDate!),
        end:   new Date(t.dueDate!),
        todo:  t,
      })),
    [calTodos]
  );

  // Derive event styles from overdue status and priority.
  // Overdue always renders in urgent red regardless of priority.
  // Text contrast: light backgrounds (low/high) use dark text; dark backgrounds use white.
  function eventStyleGetter(event: CalEvent) {
    const overdue   = isOverdue(event.todo);
    const bgColor   = overdue
      ? "#FF4D4D"
      : (PRIORITY_COLORS[event.todo.priority] ?? "#FFE500");
    const textColor =
      bgColor === "#FF4D4D" || bgColor === "#00D4FF" ? "#FFFFFF" : "#1A1A1A";

    return {
      style: {
        backgroundColor: bgColor,
        color:           textColor,
        border:          "2px solid #1A1A1A",
        borderRadius:    "0px",   // Neo-Brutalism: hard corners, no rounding
        fontWeight:      "bold",
        fontSize:        "0.75rem",
        padding:         "1px 4px",
      },
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── View toggle — custom Neo-Brutalism button group ── */}
      {/* We render our own toggle and still pass `view`/`onView` to rbc so that
          the built-in toolbar nav buttons (prev / next / today) continue to work
          correctly for the active view. */}
      <div className="flex border-[length:var(--border-width)] border-foreground w-fit">
        {(["month", "week", "day"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              "px-4 py-2 text-sm font-bold uppercase",
              "border-r-[length:var(--border-width)] border-foreground last:border-r-0",
              "transition-all duration-75",
              view === v
                ? "bg-foreground text-surface"
                : "bg-surface text-foreground hover:bg-foreground/10",
            ].join(" ")}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── Calendar container ── */}
      {/* Tailwind arbitrary selectors override rbc's internal class names without
          a separate CSS file or !important specificity hacks. */}
      <div
        className={[
          "border-[length:var(--border-width)] border-foreground",
          "shadow-[var(--shadow)]",
          "bg-surface",
          "[&_.rbc-header]:border-foreground",
          "[&_.rbc-header]:font-black",
          "[&_.rbc-header]:uppercase",
          "[&_.rbc-day-bg+.rbc-day-bg]:border-foreground",
          "[&_.rbc-month-row+.rbc-month-row]:border-foreground",
          "[&_.rbc-today]:bg-primary/20",
          "[&_.rbc-off-range-bg]:bg-foreground/5",
          "[&_.rbc-toolbar-label]:font-black",
          "[&_.rbc-toolbar-label]:text-lg",
          "[&_.rbc-btn-group_button]:border-foreground",
          "[&_.rbc-btn-group_button]:font-bold",
          "[&_.rbc-btn-group_button.rbc-active]:bg-foreground",
          "[&_.rbc-btn-group_button.rbc-active]:text-surface",
        ].join(" ")}
        style={{ height: 600 }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          tooltipAccessor={(event: CalEvent) =>
            `${event.title} — ${event.todo.priority} priority`
          }
        />
      </div>
    </div>
  );
}
