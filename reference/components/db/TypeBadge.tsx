"use client";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  INT:       { bg: "rgba(59,130,246,0.15)",  text: "#7DD3FC" },
  INT8:      { bg: "rgba(59,130,246,0.15)",  text: "#7DD3FC" },
  INT4:      { bg: "rgba(59,130,246,0.15)",  text: "#7DD3FC" },
  BIGINT:    { bg: "rgba(59,130,246,0.15)",  text: "#7DD3FC" },
  SERIAL:    { bg: "rgba(59,130,246,0.15)",  text: "#7DD3FC" },
  VARCHAR:   { bg: "rgba(16,185,129,0.15)",  text: "#6EE7B7" },
  TEXT:      { bg: "rgba(16,185,129,0.15)",  text: "#6EE7B7" },
  TIMESTAMP: { bg: "rgba(139,92,246,0.15)",  text: "#C4B5FD" },
  DATE:      { bg: "rgba(139,92,246,0.15)",  text: "#C4B5FD" },
  BOOL:      { bg: "rgba(245,158,11,0.15)",  text: "#FCD34D" },
  BOOLEAN:   { bg: "rgba(245,158,11,0.15)",  text: "#FCD34D" },
  JSONB:     { bg: "rgba(239,68,68,0.15)",   text: "#FCA5A5" },
  JSON:      { bg: "rgba(239,68,68,0.15)",   text: "#FCA5A5" },
  UUID:      { bg: "rgba(99,102,241,0.15)",  text: "#A5B4FC" },
  FLOAT:     { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
  NUMERIC:   { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
};

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const colors = TYPE_COLORS[type.toUpperCase()] ?? {
    bg: "rgba(68,85,102,0.3)",
    text: "var(--text-muted)",
  };
  return (
    <span
      className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded font-medium", className)}
      style={{ background: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}
