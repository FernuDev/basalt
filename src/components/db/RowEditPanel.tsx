import { useState, useEffect, useCallback } from "react";
import { X, Key, Link2, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { db, mongo } from "../../lib/db";
import type { ColumnDef } from "../../lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Names likely to be representative / human-readable for a row. */
const REPRESENTATIVE_NAMES = [
  "name", "nombre", "title", "titulo", "label", "code", "codigo",
  "email", "username", "user_name", "display_name", "full_name",
  "firstname", "first_name", "lastname", "last_name", "description",
  "descripcion", "slug", "handle", "alias",
];

function findRepresentativeField(columnNames: string[]): string | null {
  const lower = columnNames.map((c) => c.toLowerCase());
  for (const rep of REPRESENTATIVE_NAMES) {
    const idx = lower.indexOf(rep);
    if (idx !== -1) return columnNames[idx];
  }
  return null;
}

/** Shorten a value for display: first UUID group or first 10 chars. */
function shortId(val: unknown): string {
  const str = String(val ?? "");
  if (/^[0-9a-f]{8}-/i.test(str)) return str.split("-")[0];
  return str.length > 12 ? str.slice(0, 10) + "…" : str;
}

/**
 * Parse "schema.table.column" or "table.column" from the foreign_key field.
 * Returns { tableRef: "schema.table", column: "col" }.
 */
function parseFkRef(fk: string): { tableRef: string; column: string } {
  const parts = fk.split(".");
  if (parts.length >= 3) {
    return {
      tableRef: `${parts[0]}.${parts[1]}`,
      column: parts[2],
    };
  }
  return {
    tableRef: `public.${parts[0]}`,
    column: parts[1] ?? "id",
  };
}

/** Build a safe PostgreSQL literal from a JS value. */
function pgLiteral(val: unknown): string {
  if (val === null || val === undefined || val === "") return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FkOption {
  value: string;
  label: string;
}

interface RowEditPanelProps {
  open: boolean;
  row: unknown[];
  columns: ColumnDef[];
  tableName: string;      // "schema.table" or "database.collection"
  connectionId: string;
  isMongo?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RowEditPanel({
  open,
  row,
  columns,
  tableName,
  connectionId,
  isMongo = false,
  onClose,
  onSaved,
}: RowEditPanelProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fkOptions, setFkOptions] = useState<Record<string, FkOption[]>>({});
  const [loadingFk, setLoadingFk] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialise form values when the panel opens
  useEffect(() => {
    if (!open || columns.length === 0) return;
    const init: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      init[col.name] = row[i] ?? null;
    });
    setValues(init);
    // FK smart selects are only for PostgreSQL
    if (!isMongo) loadFkOptions(init);
  }, [open, row, columns]);

  const loadFkOptions = useCallback(
    async (_currentValues: Record<string, unknown>) => {
      const fkCols = columns.filter((c) => c.foreign_key);
      if (fkCols.length === 0) return;
      setLoadingFk(true);

      const opts: Record<string, FkOption[]> = {};
      await Promise.all(
        fkCols.map(async (col) => {
          if (!col.foreign_key) return;
          const { tableRef, column: fkColumn } = parseFkRef(col.foreign_key);
          try {
            const result = await db.getTableData(connectionId, tableRef, 500, 0);
            const repField = findRepresentativeField(result.columns);
            const pkIdx = result.columns.indexOf(fkColumn);
            const repIdx = repField ? result.columns.indexOf(repField) : -1;

            opts[col.name] = result.rows.map((r) => {
              const idVal = pkIdx >= 0 ? r[pkIdx] : r[0];
              const repVal = repIdx >= 0 ? r[repIdx] : null;
              const label = repVal
                ? `${shortId(idVal)}  ·  ${repVal}`
                : shortId(idVal);
              return { value: String(idVal ?? ""), label };
            });

            // If the current value isn't in the list (null / already valid), keep it
          } catch {
            opts[col.name] = [];
          }
        })
      );

      setFkOptions((prev) => ({ ...prev, ...opts }));
      setLoadingFk(false);
    },
    [columns, connectionId]
  );

  const handleChange = (colName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [colName]: value }));
  };

  const handleSave = async () => {
    const pkCol = columns.find((c) => c.is_primary_key);
    if (!pkCol) {
      toast.error("Cannot update: no primary key found for this table.");
      return;
    }

    setSaving(true);

    if (isMongo) {
      // MongoDB path: build a JSON patch object from non-_id fields
      const updates: Record<string, unknown> = {};
      columns
        .filter((c) => !c.is_primary_key)
        .forEach((c) => { updates[c.name] = values[c.name] ?? null; });

      try {
        await mongo.updateDocument(
          connectionId,
          tableName,
          String(values[pkCol.name] ?? ""),
          JSON.stringify(updates)
        );
        toast.success("Document updated successfully.");
        onSaved();
        onClose();
      } catch (err) {
        toast.error(`Update failed: ${err}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    // PostgreSQL path
    const parts = tableName.split(".");
    const schema = parts[0];
    const table = parts[1] ?? parts[0];

    const setClauses = columns
      .filter((c) => !c.is_primary_key)
      .map((c) => `"${c.name}" = ${pgLiteral(values[c.name])}`)
      .join(", ");

    if (!setClauses) {
      toast.error("Nothing to update.");
      setSaving(false);
      return;
    }

    const sql = `UPDATE "${schema}"."${table}" SET ${setClauses} WHERE "${pkCol.name}" = ${pgLiteral(values[pkCol.name])} RETURNING *`;

    try {
      await db.executeQuery(connectionId, sql);
      toast.success("Row updated successfully.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(`Update failed: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const init: Record<string, unknown> = {};
    columns.forEach((col, i) => { init[col.name] = row[i] ?? null; });
    setValues(init);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 460,
          background: "#0E0F1A",
          borderLeft: "1px solid #282940",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #1E1F32" }}
        >
          <div>
            <h2 className="text-sm font-semibold font-sans" style={{ color: "#E8EAFF" }}>
              Edit Row
            </h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: "#484A6E" }}>
              {tableName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loadingFk && (
              <div className="flex items-center gap-1.5 text-xs font-sans" style={{ color: "#484A6E" }}>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading FKs…
              </div>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer transition-colors hover:bg-basalt-elevated"
              style={{ color: "#484A6E" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {columns.map((col) => {
            const value = values[col.name];
            const fkOpts = col.foreign_key ? (fkOptions[col.name] ?? null) : null;

            return (
              <div key={col.name} className="flex flex-col gap-1.5">
                {/* Label */}
                <div className="flex items-center gap-2">
                  {col.is_primary_key && (
                    <Key className="w-3 h-3 flex-shrink-0" style={{ color: "#F59E0B" }} />
                  )}
                  {col.foreign_key && !col.is_primary_key && (
                    <Link2 className="w-3 h-3 flex-shrink-0" style={{ color: "#7C4FD4" }} />
                  )}
                  <label
                    className="text-xs font-mono font-medium"
                    style={{ color: col.is_primary_key ? "#F59E0B" : "#8890BB" }}
                  >
                    {col.name}
                  </label>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "#13141F", color: "#3A3B58", border: "1px solid #1E1F32" }}
                  >
                    {col.data_type}
                  </span>
                  {!col.is_nullable && (
                    <span className="text-[10px] font-sans" style={{ color: "#484A6E" }}>
                      required
                    </span>
                  )}
                </div>

                {/* PK field — readonly */}
                {col.is_primary_key && (
                  <div
                    className="px-3 py-2 rounded-md font-mono text-xs"
                    style={{
                      background: "rgba(245,158,11,0.06)",
                      border: "1px solid rgba(245,158,11,0.2)",
                      color: "#F59E0B",
                    }}
                  >
                    {String(value ?? "null")}
                  </div>
                )}

                {/* FK field — smart select */}
                {!col.is_primary_key && col.foreign_key && (
                  fkOpts === null ? (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-md"
                      style={{ background: "#13141F", border: "1px solid #1E1F32" }}
                    >
                      <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#484A6E" }} />
                      <span className="text-xs font-mono" style={{ color: "#484A6E" }}>
                        Loading options…
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={String(value ?? "")}
                        onChange={(e) => handleChange(col.name, e.target.value || null)}
                        className="w-full px-3 py-2 rounded-md font-mono text-xs appearance-none outline-none cursor-pointer"
                        style={{
                          background: "#13141F",
                          border: "1px solid #282940",
                          color: "#E8EAFF",
                          paddingRight: 32,
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#7C4FD4"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#282940"; }}
                      >
                        {col.is_nullable && (
                          <option value="">— null —</option>
                        )}
                        {fkOpts.length === 0 && (
                          <option value={String(value ?? "")} disabled>
                            (no options found)
                          </option>
                        )}
                        {fkOpts.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: "#484A6E" }}
                      >
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      {/* FK reference label */}
                      <p className="mt-1 text-[10px] font-mono" style={{ color: "#3A3B58" }}>
                        → {col.foreign_key}
                      </p>
                    </div>
                  )
                )}

                {/* Boolean field */}
                {!col.is_primary_key && !col.foreign_key &&
                  (col.data_type === "boolean" || typeof value === "boolean") && (
                    <div className="flex items-center gap-3">
                      {["true", "false", "null"].map((opt) => {
                        const active =
                          opt === "null"
                            ? value === null
                            : String(value) === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() =>
                              handleChange(
                                col.name,
                                opt === "null" ? null : opt === "true"
                              )
                            }
                            className="px-3 py-1.5 rounded-md text-xs font-mono cursor-pointer transition-colors"
                            style={{
                              background: active ? "rgba(124,79,212,0.2)" : "#13141F",
                              border: active ? "1px solid #7C4FD4" : "1px solid #1E1F32",
                              color: active ? "#E8EAFF" : "#484A6E",
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                {/* Text / everything else */}
                {!col.is_primary_key && !col.foreign_key &&
                  col.data_type !== "boolean" && typeof value !== "boolean" && (
                    <input
                      type="text"
                      value={value === null ? "" : String(value)}
                      placeholder={col.is_nullable ? "null" : ""}
                      onChange={(e) =>
                        handleChange(col.name, e.target.value === "" && col.is_nullable ? null : e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-md font-mono text-xs outline-none transition-colors"
                      style={{
                        background: "#13141F",
                        border: "1px solid #282940",
                        color: "#E8EAFF",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#7C4FD4"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#282940"; }}
                    />
                  )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid #1E1F32" }}
        >
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-sans cursor-pointer transition-colors"
            style={{ color: "#484A6E", border: "1px solid #1E1F32" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#8890BB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#484A6E"; }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-sans rounded-md cursor-pointer transition-colors"
              style={{ color: "#484A6E" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-sans font-semibold rounded-md cursor-pointer disabled:opacity-50 transition-all"
              style={{
                background: "linear-gradient(135deg, #7C4FD4, #9D6FE8)",
                color: "white",
                boxShadow: saving ? "none" : "0 0 12px rgba(124,79,212,0.3)",
              }}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
