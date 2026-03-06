"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  separator?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClick = () => onClose();
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  // Auto-flip near edges
  const menuW = 200;
  const menuH = items.length * 32 + 16;
  const left = x + menuW > window.innerWidth  ? x - menuW : x;
  const top  = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <div
      ref={menuRef}
      style={{ position: "fixed", left, top, zIndex: 9999, minWidth: menuW }}
      className="bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-lg shadow-2xl py-1 overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="h-px bg-[var(--border-subtle)] my-1 mx-1" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.onClick?.(); onClose(); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-sans text-left",
              "transition-colors duration-100",
              item.variant === "destructive"
                ? "text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
              item.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {item.icon && (
              <span className="w-4 h-4 flex-shrink-0 opacity-70">{item.icon}</span>
            )}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
