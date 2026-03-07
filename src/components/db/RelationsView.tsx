import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { db } from "../../lib/db";
import type { Connection, ForeignKey } from "../../lib/types";

const NODE_W = 180;
const NODE_H_BASE = 36;
const ROW_H = 24;

function getBezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

interface RelationsViewProps {
  connection: Connection | null;
}

export function RelationsView({ connection }: RelationsViewProps) {
  const [fks, setFks] = useState<ForeignKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [activeRelIdx, setActiveRelIdx] = useState<number | null>(null);

  const accentColor = connection?.color ?? "#4F7EE8";
  const isMongo = connection?.type === "mongodb";
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!connection || connection.status !== "connected" || isMongo) return;
    loadForeignKeys();
  }, [connection?.id]);

  const loadForeignKeys = async () => {
    if (!connection || isMongo) return;
    setLoading(true);
    try {
      const keys = await db.getForeignKeys(connection.id);
      setFks(keys);
    } catch (err) {
      toast.error(`Failed to load relations: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // MongoDB empty state
  if (isMongo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(30,31,50,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(30,31,50,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <GitBranch className="w-5 h-5" style={{ color: "#10B981" }} />
        </div>
        <div className="relative z-10 text-center">
          <p className="text-sm font-sans font-medium" style={{ color: "#8890BB" }}>
            Relations not supported for MongoDB
          </p>
          <p className="text-xs font-sans mt-1 max-w-xs" style={{ color: "#484A6E" }}>
            MongoDB does not have native foreign keys. Use the Query Editor to explore document references manually.
          </p>
        </div>
      </div>
    );
  }

  // Build unique table list from FKs
  const tables = Array.from(
    new Set([...fks.map((fk) => fk.from_table), ...fks.map((fk) => fk.to_table)])
  );

  // Auto-layout: simple grid
  const nodePositions: Record<string, { x: number; y: number }> = {};
  const cols = Math.ceil(Math.sqrt(tables.length)) || 1;
  tables.forEach((t, i) => {
    nodePositions[t] = {
      x: (i % cols) * (NODE_W + 60),
      y: Math.floor(i / cols) * (NODE_H_BASE + ROW_H * 3 + 60),
    };
  });

  const getNodeHeight = (tableName: string) => {
    const cols = fks.filter((fk) => fk.from_table === tableName || fk.to_table === tableName);
    return NODE_H_BASE + Math.min(cols.length, 5) * ROW_H + 8;
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    },
    [dragging, lastMouse]
  );

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(2, Math.max(0.3, s * delta)));
  }, []);

  // SVG paths
  const paths = fks.map((fk, i) => {
    const fromPos = nodePositions[fk.from_table];
    const toPos = nodePositions[fk.to_table];
    if (!fromPos || !toPos) return null;

    const fromH = getNodeHeight(fk.from_table);
    const toH = getNodeHeight(fk.to_table);

    const x1 = fromPos.x + NODE_W;
    const y1 = fromPos.y + fromH / 2;
    const x2 = toPos.x;
    const y2 = toPos.y + toH / 2;

    const isActive = activeRelIdx === i;
    const color = isActive ? accentColor : "#3A3B58";

    return (
      <g key={i}>
        <path
          d={getBezierPath(x1, y1, x2, y2)}
          fill="none"
          stroke={color}
          strokeWidth={isActive ? 2 : 1.5}
          opacity={activeRelIdx !== null && !isActive ? 0.2 : 0.8}
        />
        <circle
          cx={x2}
          cy={y2}
          r={3}
          fill={color}
          opacity={activeRelIdx !== null && !isActive ? 0.2 : 1}
        />
      </g>
    );
  });

  if (!connection) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <GitBranch className="w-12 h-12 mx-auto mb-3" style={{ color: "#282940" }} />
          <p className="text-sm font-sans" style={{ color: "#484A6E" }}>
            No connection selected
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: "#0A0B13" }}>
      {/* ERD Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          borderRight: "1px solid #1E1F32",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Dot grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern
              id="dots"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.8" fill="#1E1F32" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Zoom hint */}
        <div
          className="absolute bottom-3 left-3 text-[10px] font-sans px-2 py-1 rounded z-10"
          style={{
            background: "#13141F",
            color: "#484A6E",
            border: "1px solid #1E1F32",
          }}
        >
          Scroll to zoom · Drag to pan · {Math.round(scale * 100)}%
        </div>

        {fks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <GitBranch className="w-10 h-10 mx-auto mb-3" style={{ color: "#282940" }} />
              <p className="text-sm font-sans" style={{ color: "#484A6E" }}>
                No foreign keys found in this database
              </p>
            </div>
          </div>
        )}

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
          {/* SVG curves */}
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
          {tables.map((tableName) => {
            const pos = nodePositions[tableName];
            if (!pos) return null;
            const relatedCols = fks.filter(
              (fk) => fk.from_table === tableName || fk.to_table === tableName
            );

            return (
              <div
                key={tableName}
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
                    border: "1px solid #282940",
                    background: "#13141F",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                      background: `${accentColor}18`,
                      borderBottom: "1px solid #1E1F32",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: accentColor }}
                    />
                    <span
                      className="font-mono text-xs font-semibold truncate"
                      style={{ color: "#E8EAFF" }}
                    >
                      {tableName}
                    </span>
                  </div>
                  <div className="py-1">
                    {relatedCols.slice(0, 5).map((fk, idx) => {
                      const isFrom = fk.from_table === tableName;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3"
                          style={{ height: ROW_H }}
                        >
                          <span
                            className="font-mono text-[11px] truncate flex-1"
                            style={{ color: "#8890BB" }}
                          >
                            {isFrom ? fk.from_column : fk.to_column}
                          </span>
                          <span
                            className="font-mono text-[9px]"
                            style={{ color: isFrom ? "#7C4FD4" : "#4F7EE8" }}
                          >
                            {isFrom ? "FK" : "REF"}
                          </span>
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

      {/* Relations list */}
      <div
        className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: "#0E0F1A" }}
      >
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid #1E1F32" }}
        >
          <h2
            className="text-xs font-semibold font-sans uppercase tracking-widest"
            style={{ color: "#484A6E" }}
          >
            Foreign Keys
          </h2>
          <p className="text-xs font-sans mt-0.5" style={{ color: "#484A6E" }}>
            {fks.length} relationships
          </p>
        </div>
        <div className="overflow-y-auto flex-1 py-2">
          {fks.length === 0 ? (
            <p className="text-xs font-sans px-4 py-3" style={{ color: "#484A6E" }}>
              No foreign keys defined
            </p>
          ) : (
            fks.map((fk, i) => {
              const isActive = activeRelIdx === i;
              return (
                <button
                  key={i}
                  className="w-full text-left px-4 py-3 transition-colors cursor-pointer"
                  style={{
                    background: isActive ? "#13141F" : "transparent",
                    borderLeft: isActive
                      ? `2px solid ${accentColor}`
                      : "2px solid transparent",
                  }}
                  onMouseEnter={() => setActiveRelIdx(i)}
                  onMouseLeave={() => setActiveRelIdx(null)}
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: `${accentColor}20`,
                        color: accentColor,
                      }}
                    >
                      {fk.from_table}
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: "#484A6E" }}
                    >
                      →
                    </span>
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(139,92,246,0.15)",
                        color: "#7C4FD4",
                      }}
                    >
                      {fk.to_table}
                    </span>
                  </div>
                  <div
                    className="font-mono text-[11px]"
                    style={{ color: "#484A6E" }}
                  >
                    {fk.from_table}.{fk.from_column}
                    <span style={{ color: "#3A3B58" }}> → </span>
                    {fk.to_table}.{fk.to_column}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
