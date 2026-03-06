import { useState, useEffect } from "react";

function displayTableName(name: string): string {
  const [schema, table] = name.includes(".") ? name.split(".", 2) : ["public", name];
  return schema === "public" ? table : name;
}
import { ChevronRight, Key, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TypeBadge } from "./TypeBadge";
import { DataTable } from "./DataTable";
import { RowEditPanel } from "./RowEditPanel";
import { db } from "../../lib/db";
import type { Connection, TableMeta, ColumnDef, QueryResult } from "../../lib/types";

interface TableDetailProps {
  table: TableMeta;
  connection: Connection | null;
  onBack: () => void;
}

export function TableDetail({ table, connection, onBack }: TableDetailProps) {
  const [activeTab, setActiveTab] = useState<"data" | "structure">("data");
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Row edit panel state
  const [editRow, setEditRow] = useState<unknown[] | null>(null);
  const [editCols, setEditCols] = useState<ColumnDef[]>([]);

  const accentColor = connection?.color ?? "#4F7EE8";

  useEffect(() => {
    if (!connection) return;
    loadData(1, limit);
    loadStructure();
  }, [table.name, connection?.id]);

  const loadData = async (p: number, l: number) => {
    if (!connection) return;
    setLoading(true);
    try {
      const result = await db.getTableData(
        connection.id,
        table.name,
        l,
        (p - 1) * l
      );
      setQueryResult(result);
    } catch (err) {
      toast.error(`Failed to load table data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStructure = async () => {
    if (!connection) return;
    try {
      const cols = await db.describeTable(connection.id, table.name);
      setColumns(cols);
    } catch (err) {
      toast.error(`Failed to load structure: ${err}`);
    }
  };

  const handlePageChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
    loadData(newPage, newLimit);
  };

  return (
    <div className="flex flex-col h-full">
      <RowEditPanel
        open={editRow !== null}
        row={editRow ?? []}
        columns={editCols}
        tableName={table.name}
        connectionId={connection?.id ?? ""}
        onClose={() => setEditRow(null)}
        onSaved={() => loadData(page, limit)}
      />
      {/* Breadcrumb + tabs */}
      <div
        className="flex-shrink-0 px-5 pt-3"
        style={{ borderBottom: "1px solid #1E1F32" }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={onBack}
            className="text-xs font-sans hover:underline cursor-pointer"
            style={{ color: "#8890BB" }}
          >
            Tables
          </button>
          <ChevronRight className="w-3 h-3" style={{ color: "#484A6E" }} />
          <span
            className="font-mono text-xs font-medium"
            style={{ color: "#E8EAFF" }}
          >
            {displayTableName(table.name)}
          </span>
          <span
            className="font-mono text-[10px] ml-2 px-2 py-0.5 rounded"
            style={{ background: `${accentColor}20`, color: accentColor }}
          >
            {table.row_count.toLocaleString()} rows
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-0.5">
          {(["data", "structure"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-2 text-xs font-sans capitalize transition-colors cursor-pointer"
              style={{
                color: activeTab === t ? "#E8EAFF" : "#484A6E",
                borderBottom:
                  activeTab === t
                    ? `2px solid ${accentColor}`
                    : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "data" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2
                  className="w-6 h-6 animate-spin"
                  style={{ color: accentColor }}
                />
              </div>
            ) : (
              <DataTable
                columns={queryResult ? columns.length > 0 ? columns : queryResult.columns : []}
                rows={queryResult?.rows ?? []}
                totalRows={table.row_count}
                onPageChange={handlePageChange}
                onEditRow={(row, cols) => {
                  setEditRow(row);
                  setEditCols(cols);
                }}
              />
            )}
          </>
        )}

        {activeTab === "structure" && (
          <div className="overflow-auto h-full p-5 flex flex-col gap-6">
            {columns.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <Loader2
                  className="w-5 h-5 animate-spin"
                  style={{ color: accentColor }}
                />
              </div>
            ) : (
              <section>
                <h3
                  className="text-[10px] font-semibold uppercase tracking-widest mb-3 font-sans"
                  style={{ color: "#484A6E" }}
                >
                  Columns
                </h3>
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid #1E1F32" }}
                >
                  <table className="w-full border-collapse text-left">
                    <thead style={{ background: "#13141F" }}>
                      <tr>
                        {["Name", "Type", "Nullable", "Default", "Keys"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider font-sans"
                              style={{
                                color: "#484A6E",
                                borderBottom: "1px solid #1E1F32",
                              }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col, i) => (
                        <tr
                          key={col.name}
                          style={{
                            borderBottom:
                              i < columns.length - 1
                                ? "1px solid #1E1F32"
                                : "none",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              "#13141F";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              "transparent";
                          }}
                        >
                          <td className="px-3 py-2.5">
                            <span
                              className="font-mono text-xs"
                              style={{ color: "#E8EAFF" }}
                            >
                              {col.name}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <TypeBadge type={col.data_type} />
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className="font-mono text-xs"
                              style={{
                                color: col.is_nullable ? "#484A6E" : "#F59E0B",
                              }}
                            >
                              {col.is_nullable ? "YES" : "NO"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className="font-mono text-xs italic"
                              style={{ color: "#484A6E" }}
                            >
                              {col.default_value ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {col.is_primary_key && (
                                <span
                                  className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded"
                                  style={{
                                    background: "rgba(245,158,11,0.15)",
                                    color: "#F59E0B",
                                  }}
                                >
                                  <Key className="w-3 h-3" /> PK
                                </span>
                              )}
                              {col.foreign_key && (
                                <span
                                  className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded"
                                  style={{
                                    background: "rgba(139,92,246,0.15)",
                                    color: "#7C4FD4",
                                  }}
                                >
                                  <Link2 className="w-3 h-3" /> FK →{" "}
                                  {col.foreign_key}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
