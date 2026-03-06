"use client";
import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  Download,
  Plus,
  Key,
  Link2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TypeBadge } from "./TypeBadge";
import type { ColumnDef } from "@/lib/mock-data";

interface DataTableProps {
  columns: ColumnDef[];
  rows: (string | number | null)[][];
  totalRows?: number;
  queryTime?: string;
  connectionName?: string;
}

const STATUS_CHIPS: Record<string, { bg: string; text: string }> = {
  active:   { bg: "rgba(16,185,129,0.15)",  text: "#10B981" },
  inactive: { bg: "rgba(239,68,68,0.15)",   text: "#EF4444" },
  pending:  { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B" },
  admin:    { bg: "rgba(139,92,246,0.15)",  text: "#8B5CF6" },
  user:     { bg: "rgba(59,130,246,0.15)",  text: "#3B82F6" },
  editor:   { bg: "rgba(20,184,166,0.15)",  text: "#14B8A6" },
};

function CellValue({ col, value }: { col: ColumnDef; value: string | number | null }) {
  if (value === null) {
    return <span style={{ color: "var(--text-muted)" }} className="italic text-xs">null</span>;
  }
  const strVal = String(value);

  // Status/role chips
  if (col.name === "status" || col.name === "role") {
    const chip = STATUS_CHIPS[strVal.toLowerCase()];
    if (chip) {
      return (
        <span
          className="font-mono text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: chip.bg, color: chip.text }}
        >
          {strVal}
        </span>
      );
    }
  }

  // JSONB
  if (col.type === "JSONB" && strVal.startsWith("{")) {
    return (
      <span className="font-mono text-xs" style={{ color: "var(--accent-red)" }}>
        {strVal}
      </span>
    );
  }

  // Timestamps
  if (col.type === "TIMESTAMP") {
    return <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>{strVal}</span>;
  }

  // Numbers
  if (col.type === "INT8" || col.type === "INT4" || col.type === "BIGINT" || col.type === "INT") {
    return <span className="font-mono text-xs" style={{ color: "var(--text-code)" }}>{strVal}</span>;
  }

  return (
    <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>
      {strVal}
    </span>
  );
}

export function DataTable({
  columns,
  rows,
  totalRows = 0,
  queryTime,
  connectionName,
}: DataTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const rowsPerPage = 25;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {[
          { icon: <Filter className="w-3.5 h-3.5" />, label: "Filter" },
          { icon: <ArrowUpDown className="w-3.5 h-3.5" />, label: "Sort" },
          { icon: <Download className="w-3.5 h-3.5" />, label: "Export CSV" },
        ].map(({ icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            {icon} {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium"
          style={{ background: "var(--accent-blue)", color: "white" }}
        >
          <Plus className="w-3.5 h-3.5" /> Insert row
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse text-left" style={{ minWidth: 600 }}>
          <thead
            className="sticky top-0 z-10"
            style={{ background: "var(--bg-surface)" }}
          >
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.name}
                  className="group cursor-pointer select-none"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    padding: "8px 12px",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => handleSort(i)}
                >
                  <div className="flex items-center gap-2">
                    {col.pk && (
                      <Key className="w-3 h-3 flex-shrink-0" style={{ color: "var(--accent-amber)" }} />
                    )}
                    {col.fk && (
                      <Link2 className="w-3 h-3 flex-shrink-0" style={{ color: "var(--accent-violet)" }} />
                    )}
                    <span className="font-mono text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      {col.name}
                    </span>
                    <TypeBadge type={col.type} />
                    <span
                      className={cn(
                        "ml-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        sortCol === i && "opacity-100"
                      )}
                      style={{ color: "var(--text-muted)" }}
                    >
                      {sortCol === i ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="group"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                }}
              >
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                    <CellValue col={columns[ci]} value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          {queryTime && (
            <span className="text-xs font-mono" style={{ color: "var(--accent-green)" }}>
              ✓ {rows.length} rows returned · {queryTime}
              {connectionName && (
                <span style={{ color: "var(--text-muted)" }}> · {connectionName}</span>
              )}
            </span>
          )}
          {!queryTime && (
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {totalRows.toLocaleString()} rows total
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans disabled:opacity-30"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans disabled:opacity-30"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <select
            className="ml-2 text-xs font-sans rounded px-2 py-1"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <option>25 rows</option>
            <option>50 rows</option>
            <option>100 rows</option>
          </select>
        </div>
      </div>
    </div>
  );
}
