import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShortcutHandlers {
  onNewTodo: () => void;
  onToggleHelp: () => void;
}

/**
 * Tag names of interactive form elements where we must not fire global shortcuts,
 * to avoid interfering with the user's typing.
 */
const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Registers single-key global keyboard shortcuts for the Kanban app.
 *
 * Shortcuts are suppressed when:
 * - A modifier key (Meta / Ctrl / Alt) is held — prevents hijacking browser shortcuts
 * - Focus is on an INPUT, TEXTAREA, SELECT, or contentEditable element
 *
 * Key → Action mapping:
 * - `n`        → open new-todo modal
 * - `k` / `b`  → navigate to Kanban board (/)
 * - `c`        → navigate to Calendar (/calendar)
 * - `f`        → focus the #filter-panel element
 * - `?`        → toggle keyboard-shortcuts help overlay
 * - `Escape`   → no-op here; each modal owns its own Escape handler
 */
export function useKeyboardShortcuts({ onNewTodo, onToggleHelp }: ShortcutHandlers) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Never override browser or OS-level shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Skip when the user is typing inside a form field or rich-text editor
      const target = e.target as HTMLElement;
      if (
        INPUT_TAGS.has(target.tagName) ||
        target.contentEditable === "true"
      ) {
        return;
      }

      switch (e.key) {
        case "n":
          e.preventDefault();
          onNewTodo();
          break;

        case "k":
        case "b":
          e.preventDefault();
          router.push("/");
          break;

        case "c":
          e.preventDefault();
          router.push("/calendar");
          break;

        case "f":
          e.preventDefault();
          document.getElementById("filter-panel")?.focus();
          break;

        case "?":
          e.preventDefault();
          onToggleHelp();
          break;

        case "Escape":
          // Individual modals attach their own Escape handlers via useEffect.
          // This case is intentionally a no-op at the global level.
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, onNewTodo, onToggleHelp]);
}
