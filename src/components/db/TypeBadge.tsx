import { cn } from "../../lib/utils";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  // ── PostgreSQL types ─────────────────────────────────────────────────────
  INT:       { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  INT2:      { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  INT4:      { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  INT8:      { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  BIGINT:    { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  INTEGER:   { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  SERIAL:    { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  VARCHAR:   { bg: "rgba(16,185,129,0.15)",  text: "#6EE7B7" },
  TEXT:      { bg: "rgba(16,185,129,0.15)",  text: "#6EE7B7" },
  "CHARACTER VARYING": { bg: "rgba(16,185,129,0.15)", text: "#6EE7B7" },
  TIMESTAMP: { bg: "rgba(139,92,246,0.15)",  text: "#C4B5FD" },
  TIMESTAMPTZ: { bg: "rgba(139,92,246,0.15)", text: "#C4B5FD" },
  DATE:      { bg: "rgba(139,92,246,0.15)",  text: "#C4B5FD" },
  BOOL:      { bg: "rgba(245,158,11,0.15)",  text: "#FCD34D" },
  BOOLEAN:   { bg: "rgba(245,158,11,0.15)",  text: "#FCD34D" },
  JSONB:     { bg: "rgba(239,68,68,0.15)",   text: "#FCA5A5" },
  JSON:      { bg: "rgba(239,68,68,0.15)",   text: "#FCA5A5" },
  UUID:      { bg: "rgba(99,102,241,0.15)",  text: "#A5B4FC" },
  FLOAT4:    { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
  FLOAT8:    { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
  NUMERIC:   { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
  DECIMAL:   { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
  // ── BSON / MongoDB types ─────────────────────────────────────────────────
  OBJECTID:    { bg: "rgba(251,146,60,0.15)",  text: "#FB923C" },
  STRING:      { bg: "rgba(16,185,129,0.15)",  text: "#6EE7B7" },
  INT32:       { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  INT64:       { bg: "rgba(59,130,246,0.15)",  text: "#A5B4FC" },
  DOUBLE:      { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
  DECIMAL128:  { bg: "rgba(20,184,166,0.15)",  text: "#5EEAD4" },
  NULL:        { bg: "rgba(68,85,102,0.2)",     text: "#484A6E" },
  ARRAY:       { bg: "rgba(20,184,166,0.15)",  text: "#2DD4BF" },
  OBJECT:      { bg: "rgba(232,78,198,0.15)",  text: "#F0ABFC" },
  BINARY:      { bg: "rgba(68,85,102,0.2)",    text: "#94A3B8" },
  UNKNOWN:     { bg: "rgba(68,85,102,0.2)",    text: "#484A6E" },
};

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  const key = type.toUpperCase();
  const colors = TYPE_COLORS[key] ?? {
    bg: "rgba(68,85,102,0.3)",
    text: "#484A6E",
  };
  return (
    <span
      className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded font-medium", className)}
      style={{ background: colors.bg, color: colors.text }}
    >
      {type.toUpperCase()}
    </span>
  );
}
