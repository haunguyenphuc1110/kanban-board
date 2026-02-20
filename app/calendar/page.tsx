// app/calendar/page.tsx
// Server component — no "use client" needed.
// Header, FilterPanel, and CalendarView all carry their own "use client" boundaries,
// so Next.js will automatically split them into client bundles while this page
// remains a React Server Component.
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
