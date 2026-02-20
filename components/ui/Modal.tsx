"use client";

import { useEffect, ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Tailwind bg- class applied to the header bar. Default: "bg-primary" */
  headerColor?: string;
  children: ReactNode;
  /** Tailwind max-w- class controlling panel width. Default: "max-w-lg" */
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  headerColor = "bg-primary",
  children,
  maxWidth = "max-w-lg",
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Overlay — click directly on the backdrop to close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div
        className={[
          "relative w-full",
          maxWidth,
          "border-[length:var(--border-width)] border-foreground",
          "bg-surface",
          "shadow-[8px_8px_0px_var(--border-color)]",
        ].join(" ")}
      >
        {/* Header bar */}
        <div
          className={[
            headerColor,
            "flex items-center justify-between",
            "border-b-[length:var(--border-width)] border-foreground",
            "px-5 py-3",
          ].join(" ")}
        >
          <h2 className="text-lg font-black text-foreground uppercase tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-foreground/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
