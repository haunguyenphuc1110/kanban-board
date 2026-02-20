"use client";

import { useTodoStore } from "@/lib/store/todoStore";
import type { Priority } from "@/lib/types";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

/**
 * Inline filter bar with priority chips, category chips, and a search input.
 *
 * The container has id="filter-panel" so the keyboard shortcut handler in the
 * root page can focus it via document.getElementById("filter-panel")?.focus().
 * tabIndex={-1} makes the div programmatically focusable without appearing in
 * the natural tab order.
 *
 * Active filter chips use the "depressed" Neo-Brutalism style (translate + no shadow).
 * Clear filters link appears only when at least one filter is active.
 */
export function FilterPanel() {
  const { filters, categories, setFilters, resetFilters } = useTodoStore();

  const hasActiveFilters =
    filters.priorities.length > 0 ||
    filters.categoryIds.length > 0 ||
    !!filters.searchQuery;

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

      {/* Priority filter chips — OR logic, see decisions.md D13 */}
      {PRIORITIES.map((p) => {
        const active = filters.priorities.includes(p);
        return (
          <button
            key={p}
            type="button"
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

      {/* Category filter chips — background color from the category definition */}
      {categories.map((cat) => {
        const active = filters.categoryIds.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
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

      {/* Full-text search input */}
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

      {/* Clear filters — only visible when at least one filter is active */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-bold text-secondary underline hover:no-underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
