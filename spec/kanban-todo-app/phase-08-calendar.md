# Phase 8 — Calendar View

## 8.1 Overview

The calendar view displays todos that have a `dueDate` and are not yet completed.
It uses `react-big-calendar` with the `date-fns` localizer (not Moment.js).

**Key decisions:**
- Import `react-big-calendar/lib/css/react-big-calendar.css` inside a `"use client"` component —
  CSS imports only work in client components in Next.js App Router.
- Map priorities to colors using CSS variable values (not Tailwind classes — rbc doesn't know Tailwind).
- Override react-big-calendar default styles using Tailwind's arbitrary CSS selectors.
- Overdue events (past dueDate, status ≠ completed) use `var(--secondary)` (#FF4D4D) as background.

---

## 8.2 CalendarView Component (`components/calendar/CalendarView.tsx`)

```typescript
// components/calendar/CalendarView.tsx
"use client";

// CSS must be imported in a client component
import "react-big-calendar/lib/css/react-big-calendar.css";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useTodoStore } from "@/lib/store/todoStore";
import { applyFilters, isOverdue } from "@/lib/filters/todoFilters";
import type { TodoItem } from "@/lib/types";

// ── date-fns localizer ──────────────────────────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), // Sunday
  getDay,
  locales: { "en-US": enUS },
});

// ── Priority → event color ──────────────────────────────────────────────────
// Using actual hex values (not Tailwind classes) because rbc applies them via style prop
const PRIORITY_COLORS: Record<string, string> = {
  low:    "#AAFF00", // --success
  medium: "#00D4FF", // --accent
  high:   "#FFE500", // --primary
  urgent: "#FF4D4D", // --secondary
};

// ── Calendar event shape ────────────────────────────────────────────────────
interface CalEvent {
  id:    string;
  title: string;
  start: Date;
  end:   Date;
  todo:  TodoItem;
}

export function CalendarView() {
  const { todos, filters } = useTodoStore();
  const [view, setView]     = useState<View>("month");
  const [date, setDate]     = useState(new Date());

  // Only show todos with a due date that aren't completed
  const calTodos = useMemo(() => {
    const filtered = applyFilters(todos, filters);
    return filtered.filter((t) => t.dueDate && t.status !== "completed");
  }, [todos, filters]);

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

  // Apply color based on overdue status or priority
  function eventStyleGetter(event: CalEvent) {
    const overdue   = isOverdue(event.todo);
    const bgColor   = overdue ? "#FF4D4D" : (PRIORITY_COLORS[event.todo.priority] ?? "#FFE500");
    const textColor = bgColor === "#FF4D4D" || bgColor === "#00D4FF" ? "#FFFFFF" : "#1A1A1A";

    return {
      style: {
        backgroundColor:  bgColor,
        color:            textColor,
        border:           "2px solid #1A1A1A",
        borderRadius:     "0px",   // Neo-Brutalism: no rounded corners
        fontWeight:       "bold",
        fontSize:         "0.75rem",
        padding:          "1px 4px",
      },
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {/* View toggle — Neo-Brutalism button group */}
      <div className="flex border-[length:var(--border-width)] border-foreground w-fit">
        {(["month", "week", "day"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              "px-4 py-2 text-sm font-bold uppercase border-r-[length:var(--border-width)] border-foreground last:border-r-0",
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

      {/* Calendar — override rbc default styles */}
      <div
        className={[
          "border-[length:var(--border-width)] border-foreground",
          "shadow-[var(--shadow)]",
          "bg-surface",
          // Tailwind arbitrary selectors to Neo-Brutalize rbc elements
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
```

---

## 8.3 Calendar Page (`app/calendar/page.tsx`)

```typescript
// app/calendar/page.tsx
import { CalendarView } from "@/components/calendar/CalendarView";
import { Header } from "@/components/layout/Header";
import { FilterPanel } from "@/components/kanban/FilterPanel";

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header currentView="calendar" />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <FilterPanel />
        <CalendarView />
      </main>
    </div>
  );
}
```

---

## 8.4 react-big-calendar CSS Override Strategy

react-big-calendar ships its own CSS that must be imported. In Next.js App Router, CSS files
can only be imported in client components. `CalendarView.tsx` is marked `"use client"` for
exactly this reason.

The custom styles use Tailwind v4's arbitrary selector syntax to override rbc's internal
class names without writing a separate CSS file:

```
[&_.rbc-header]:border-foreground
 ↑  ↑  ↑
 &  =  the containing div
 _  =  descendant selector
 .rbc-header = rbc's internal class
```

This avoids specificity battles with `!important` and keeps all styles co-located.

---

## 8.5 Event Color Mapping

| Priority | Color (hex) | CSS Variable |
|----------|-------------|--------------|
| `low` | `#AAFF00` | `--success` |
| `medium` | `#00D4FF` | `--accent` |
| `high` | `#FFE500` | `--primary` |
| `urgent` | `#FF4D4D` | `--secondary` |
| overdue (any) | `#FF4D4D` | `--secondary` |

Text color is set to `#FFFFFF` for dark backgrounds (`urgent`, `medium`) and `#1A1A1A` for light
backgrounds (`low`, `high`).
