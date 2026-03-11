import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Download,
  Key,
  Link2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { TypeBadge } from "./TypeBadge";
import { files } from "../../lib/db";
import type { ColumnDef } from "../../lib/types";

interface DataTableProps {
  columns: ColumnDef[] | string[];
  rows: unknown[][];
  totalRows?: number;
  queryTime?: string;
  connectionName?: string;
  tableName?: string;
  onPageChange?: (page: number, limit: number) => void;
  onEditRow?: (row: unknown[], columns: ColumnDef[]) => void;
}

const STATUS_CHIPS: Record<string, { bg: string; text: string }> = {
  active:   { bg: "rgba(16,185,129,0.15)", text: "#10B981" },
  inactive: { bg: "rgba(239,68,68,0.15)",  text: "#EF4444" },
  pending:  { bg: "rgba(245,158,11,0.15)", text: "#F59E0B" },
  admin:    { bg: "rgba(139,92,246,0.15)", text: "#7C4FD4" },
  user:     { bg: "rgba(59,130,246,0.15)", text: "#4F7EE8" },
  editor:   { bg: "rgba(20,184,166,0.15)", text: "#14B8A6" },
};

function CellValue({ colName, value }: { colName: string; value: unknown }) {
  if (value === null || value === undefined) {
    return (
      <span style={{ color: "#484A6E" }} className="italic text-xs">
        null
      </span>
    );
  }
  const strVal = String(value);

  if (colName === "status" || colName === "role") {
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

  if (typeof value === "boolean") {
    return (
      <span
        className="font-mono text-xs px-1.5 py-0.5 rounded"
        style={{
          background: value ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          color: value ? "#10B981" : "#EF4444",
        }}
      >
        {String(value)}
      </span>
    );
  }

  if (typeof value === "number") {
    return (
      <span className="font-mono text-xs" style={{ color: "#A5B4FC" }}>
        {strVal}
      </span>
    );
  }

  return (
    <span className="font-mono text-xs" style={{ color: "#E8EAFF" }}>
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
  tableName,
  onPageChange,
  onEditRow,
}: DataTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [exporting, setExporting] = useState(false);
  const totalPages = Math.ceil(totalRows / limit) || 1;

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
  };

  const handlePage = (newPage: number) => {
    setPage(newPage);
    onPageChange?.(newPage, limit);
  };

  const getColName = (col: ColumnDef | string | undefined): string => {
    if (!col) return "";
    return typeof col === "string" ? col : col.name;
  };

  const getColDef = (col: ColumnDef | string | undefined): ColumnDef | null => {
    if (!col || typeof col === "string") return null;
    return col;
  };

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // RFC 4180-compliant CSV
      const csvCell = (v: unknown): string => {
        if (v === null || v === undefined) return "";
        const s = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const header = columns.map(getColName).map(csvCell).join(",");
      const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
      const csv = "\uFEFF" + header + "\r\n" + body; // BOM for Excel compatibility

      // Build a suggested filename
      const dateStr = new Date().toISOString().slice(0, 10);
      const base = tableName
        ? tableName.replace(/[^a-zA-Z0-9_.-]/g, "_")
        : connectionName
        ? `${connectionName}_export`
        : "export";
      const defaultFilename = `${base}_${dateStr}.csv`;

      // Open native Save As dialog
      const chosenPath = await save({
        defaultPath: defaultFilename,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });

      // User cancelled the dialog
      if (!chosenPath) return;

      await files.saveCsv(chosenPath, csv);
      toast.success(`Exported to ${chosenPath}`);
    } catch (err) {
      toast.error(`Export failed: ${err}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid #1E1F32" }}
      >
        <button
          onClick={exportCsv}
          disabled={exporting || rows.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans cursor-pointer disabled:opacity-40 transition-colors"
          style={{ color: "#8890BB", border: "1px solid #1E1F32" }}
          onMouseEnter={(e) => { if (!exporting) e.currentTarget.style.color = "#E8EAFF"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#8890BB"; }}
        >
          {exporting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />}
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table
          className="w-full border-collapse text-left"
          style={{ minWidth: 600 }}
        >
          <thead className="sticky top-0 z-10" style={{ background: "#0E0F1A" }}>
            <tr>
              {columns.map((col, i) => {
                const def = getColDef(col);
                const name = getColName(col);
                return (
                  <th
                    key={name}
                    className="group cursor-pointer select-none"
                    style={{
                      borderBottom: "1px solid #1E1F32",
                      padding: "8px 12px",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => handleSort(i)}
                  >
                    <div className="flex items-center gap-2">
                      {def?.is_primary_key && (
                        <Key
                          className="w-3 h-3 flex-shrink-0"
                          style={{ color: "#F59E0B" }}
                        />
                      )}
                      {def?.foreign_key && (
                        <Link2
                          className="w-3 h-3 flex-shrink-0"
                          style={{ color: "#7C4FD4" }}
                        />
                      )}
                      <span
                        className="font-mono text-xs font-medium"
                        style={{ color: "#8890BB" }}
                      >
                        {name}
                      </span>
                      {def && <TypeBadge type={def.data_type} />}
                      <span
                        className={cn(
                          "ml-1 opacity-0 group-hover:opacity-100 transition-opacity",
                          sortCol === i && "opacity-100"
                        )}
                        style={{ color: "#484A6E" }}
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
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const allDefs = columns.length > 0 && columns.every((c) => typeof c !== "string");
              const colDefs = allDefs ? (columns as ColumnDef[]) : null;
              return (
                <tr
                  key={ri}
                  className="group"
                  style={{
                    borderBottom: "1px solid #1E1F32",
                    cursor: onEditRow ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (onEditRow && colDefs) onEditRow(row, colDefs);
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "#13141F";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                  }}
                >
                  {row.map((cell, ci) => {
                    const col = columns[ci];
                    return (
                      <td key={ci} style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        <CellValue colName={getColName(col)} value={cell} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="text-center py-12 text-xs font-sans"
                  style={{ color: "#484A6E" }}
                >
                  No rows found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ borderTop: "1px solid #1E1F32" }}
      >
        <div className="flex items-center gap-3">
          {queryTime ? (
            <span className="text-xs font-mono" style={{ color: "#10B981" }}>
              ✓ {rows.length} rows returned · {queryTime}
              {connectionName && (
                <span style={{ color: "#484A6E" }}> · {connectionName}</span>
              )}
            </span>
          ) : (
            <span className="text-xs font-mono" style={{ color: "#484A6E" }}>
              {totalRows.toLocaleString()} rows total
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans disabled:opacity-30 cursor-pointer"
            style={{ color: "#8890BB", border: "1px solid #1E1F32" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs font-mono" style={{ color: "#484A6E" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => handlePage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans disabled:opacity-30 cursor-pointer"
            style={{ color: "#8890BB", border: "1px solid #1E1F32" }}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <select
            className="ml-2 text-xs font-sans rounded px-2 py-1"
            value={limit}
            onChange={(e) => {
              const l = Number(e.target.value);
              setLimit(l);
              setPage(1);
              onPageChange?.(1, l);
            }}
            style={{
              background: "#13141F",
              border: "1px solid #1E1F32",
              color: "#484A6E",
            }}
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
      </div>
    </div>
  );
}
