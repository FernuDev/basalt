"use client";
import { useState, useRef, useCallback } from "react";
import { TABLES, USERS_COLUMNS, type Relation } from "@/lib/mock-data";
import type { Connection } from "@/lib/mock-data";

// Node positions for ERD layout
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  users:    { x: 60,  y: 80  },
  projects: { x: 340, y: 40  },
  services: { x: 560, y: 160 },
  trains:   { x: 560, y: 340 },
  orders:   { x: 60,  y: 300 },
  products: { x: 340, y: 360 },
};

const NODE_W = 160;
const NODE_H_BASE = 36; // header
const ROW_H = 26;

const TABLE_COLS: Record<string, string[]> = {
  users:    ["id", "email", "name", "created_at", "role", "status"],
  projects: ["id", "name", "owner_id", "created_at"],
  services: ["id", "name", "project_id", "status"],
  trains:   ["id", "name", "service_id"],
  orders:   ["id", "user_id", "product_id", "total", "created_at"],
  products: ["id", "name", "price", "created_at"],
};

function getNodeHeight(table: string) {
  return NODE_H_BASE + (TABLE_COLS[table]?.length ?? 4) * ROW_H + 8;
}

function getBezierPath(
  x1: number, y1: number,
  x2: number, y2: number
): string {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

interface RelationsViewProps {
  relations: Relation[];
  connection: Connection | undefined;
}

export function RelationsView({ relations, connection }: RelationsViewProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [activeRelIdx, setActiveRelIdx] = useState<number | null>(null);

  const accentColor = connection?.color ?? "#3B82F6";
  const canvasRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, [dragging, lastMouse]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(2, Math.max(0.4, s * delta)));
  }, []);

  // Build SVG paths for relations
  const paths = relations.map((rel, i) => {
    const fromPos = NODE_POSITIONS[rel.from];
    const toPos   = NODE_POSITIONS[rel.to];
    if (!fromPos || !toPos) return null;

    const fromH = getNodeHeight(rel.from);
    const toH   = getNodeHeight(rel.to);

    const x1 = fromPos.x + NODE_W;
    const y1 = fromPos.y + fromH / 2;
    const x2 = toPos.x;
    const y2 = toPos.y + toH / 2;

    const isActive = activeRelIdx === i;
    const color = isActive ? accentColor : "var(--border-strong)";

    return (
      <g key={i}>
        <path
          d={getBezierPath(x1, y1, x2, y2)}
          fill="none"
          stroke={color}
          strokeWidth={isActive ? 2 : 1.5}
          strokeDasharray={rel.type === "N:1" ? "4 3" : undefined}
          opacity={activeRelIdx !== null && !isActive ? 0.2 : 0.8}
        />
        {/* Arrow head */}
        <circle cx={x2} cy={y2} r={3} fill={color} opacity={activeRelIdx !== null && !isActive ? 0.2 : 1} />
      </g>
    );
  });

  return (
    <div className="flex h-full" style={{ background: "var(--bg-base)" }}>
      {/* ERD Canvas - 60% */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          borderRight: "1px solid var(--border-subtle)",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Dot grid background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="var(--border-subtle)" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Zoom / pan hint */}
        <div
          className="absolute bottom-3 left-3 text-[10px] font-sans px-2 py-1 rounded z-10"
          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
        >
          Scroll to zoom · Drag to pan · {Math.round(scale * 100)}%
        </div>

        {/* Content */}
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {/* SVG for bezier curves */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {paths}
          </svg>

          {/* Table nodes */}
          {TABLES.map((table) => {
            const pos = NODE_POSITIONS[table.name];
            if (!pos) return null;
            const cols = TABLE_COLS[table.name] ?? [];
            const nodeH = getNodeHeight(table.name);

            return (
              <div
                key={table.name}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: NODE_W,
                }}
              >
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    border: "1px solid var(--border-default)",
                    background: "var(--bg-elevated)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                      background: `${accentColor}18`,
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: accentColor }}
                    />
                    <span
                      className="font-mono text-xs font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {table.name}
                    </span>
                  </div>
                  {/* Columns */}
                  <div className="py-1">
                    {cols.map((col) => {
                      const colDef = USERS_COLUMNS.find((c) => c.name === col);
                      return (
                        <div
                          key={col}
                          className="flex items-center gap-2 px-3"
                          style={{ height: ROW_H }}
                        >
                          {colDef?.pk && (
                            <span style={{ color: "var(--accent-amber)", fontSize: 10 }}>🔑</span>
                          )}
                          <span
                            className="font-mono text-[11px] truncate flex-1"
                            style={{ color: colDef?.pk ? "var(--text-primary)" : "var(--text-secondary)" }}
                          >
                            {col}
                          </span>
                          {colDef && (
                            <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
                              {colDef.type}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relations list - 40% */}
      <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: "var(--bg-surface)" }}>
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-xs font-semibold font-sans uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Foreign Keys
          </h2>
          <p className="text-xs font-sans mt-0.5" style={{ color: "var(--text-muted)" }}>
            {relations.length} relationships
          </p>
        </div>
        <div className="overflow-y-auto flex-1 py-2">
          {relations.map((rel, i) => {
            const isActive = activeRelIdx === i;
            return (
              <button
                key={i}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  borderLeft: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
                }}
                onMouseEnter={() => setActiveRelIdx(i)}
                onMouseLeave={() => setActiveRelIdx(null)}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: `${accentColor}20`, color: accentColor }}
                  >
                    {rel.from}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    {rel.type === "1:N" ? "──1:N──►" : "◄──N:1──"}
                  </span>
                  <span
                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: "rgba(139,92,246,0.15)", color: "var(--accent-violet)" }}
                  >
                    {rel.to}
                  </span>
                </div>
                <div className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {rel.from}.{rel.fromCol}
                  <span style={{ color: "var(--border-strong)" }}> → </span>
                  {rel.to}.{rel.toCol}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
