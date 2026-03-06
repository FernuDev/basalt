"use client";
import { useState } from "react";
import {
  Table2,
  ExternalLink,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import type { TableMeta, Connection } from "@/lib/mock-data";

interface TablesGridProps {
  tables: TableMeta[];
  activeConnection: Connection | undefined;
  onOpenTable: (name: string) => void;
}

export function TablesGrid({ tables, activeConnection, onOpenTable }: TablesGridProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const accentColor = activeConnection?.color ?? "#3B82F6";

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div>
          <h1 className="text-sm font-semibold font-sans" style={{ color: "var(--text-primary)" }}>
            Tables
          </h1>
          {activeConnection && (
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              {activeConnection.name} · {activeConnection.version}
            </p>
          )}
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-sans font-medium"
          style={{ background: accentColor, color: "white" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Create table
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-5">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
        >
          {tables.map((table) => {
            const isHovered = hoveredTable === table.name;
            return (
              <button
                key={table.name}
                className="relative text-left flex flex-col p-4 rounded-xl transition-all duration-150 group"
                style={{
                  background: isHovered ? "var(--bg-overlay)" : "var(--bg-elevated)",
                  border: `1px solid ${isHovered ? "var(--border-default)" : "var(--border-subtle)"}`,
                  transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                  boxShadow: isHovered ? `0 8px 24px rgba(0,0,0,0.4)` : "none",
                }}
                onMouseEnter={() => setHoveredTable(table.name)}
                onMouseLeave={() => setHoveredTable(null)}
                onClick={() => onOpenTable(table.name)}
              >
                {/* Quick actions */}
                {isHovered && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-sans"
                      style={{
                        background: "var(--bg-base)",
                        color: accentColor,
                        border: `1px solid ${accentColor}40`,
                      }}
                      onClick={(e) => { e.stopPropagation(); onOpenTable(table.name); }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </button>
                    <button
                      className="p-1 rounded"
                      style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: `${accentColor}20`,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  <Table2 className="w-5 h-5" style={{ color: accentColor }} />
                </div>

                {/* Name */}
                <span
                  className="font-mono text-sm font-medium block mb-1 truncate w-full"
                  style={{ color: "var(--text-primary)" }}
                >
                  {table.name}
                </span>

                {/* Row count */}
                <span className="font-mono text-xs block" style={{ color: "var(--text-muted)" }}>
                  {table.rows.toLocaleString()} rows
                </span>

                {/* Size */}
                <span className="font-mono text-[10px] block mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {table.size}
                </span>

                {/* Relations chips */}
                {table.relations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {table.relations.slice(0, 2).map((rel) => (
                      <span
                        key={rel}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                        style={{
                          background: `${accentColor}15`,
                          color: accentColor,
                          border: `1px solid ${accentColor}25`,
                        }}
                      >
                        {rel}
                      </span>
                    ))}
                    {table.relations.length > 2 && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: "var(--text-muted)" }}>
                        +{table.relations.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
