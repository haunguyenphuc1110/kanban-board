"use client";

import { Modal } from "@/components/ui/Modal";

const SHORTCUTS = [
  { key: "n",      action: "New todo" },
  { key: "k / b",  action: "Kanban view" },
  { key: "c",      action: "Calendar view" },
  { key: "f",      action: "Focus filter panel" },
  { key: "?",      action: "Show this help" },
  { key: "Escape", action: "Close modal" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" headerColor="bg-accent">
      <table className="w-full text-sm">
        <tbody>
          {SHORTCUTS.map(({ key, action }) => (
            <tr
              key={key}
              className="border-b-[2px] border-foreground/20 last:border-b-0"
            >
              <td className="py-2 pr-6">
                <kbd className="border-[2px] border-foreground bg-surface px-2 py-0.5 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--border-color)]">
                  {key}
                </kbd>
              </td>
              <td className="py-2 text-foreground/80">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
