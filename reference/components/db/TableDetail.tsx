"use client";
import { useState } from "react";
import { ChevronRight, Key, Link2 } from "lucide-react";
import { TypeBadge } from "./TypeBadge";
import { DataTable } from "./DataTable";
import { USERS_COLUMNS, USERS_ROWS } from "@/lib/mock-data";
import type { Connection, TableMeta } from "@/lib/mock-data";

interface TableDetailProps {
  table: TableMeta;
  connection: Connection | undefined;
  onBack: () => void;
}

const INDEXES = [
  { name: "users_pkey",         columns: ["id"],    type: "PRIMARY KEY", unique: true  },
  { name: "users_email_idx",    columns: ["email"], type: "BTREE",       unique: true  },
  { name: "users_created_idx",  columns: ["created_at"], type: "BTREE",  unique: false },
];

const CONSTRAINTS = [
  { name: "users_pkey",     type: "PRIMARY KEY", columns: ["id"],    definition: "PRIMARY KEY (id)"    },
  { name: "users_email_key", type: "UNIQUE",     columns: ["email"], definition: "UNIQUE (email)"      },
];

export function TableDetail({ table, connection, onBack }: TableDetailProps) {
  const [activeTab, setActiveTab] = useState<"data" | "structure">("data");
  const accentColor = connection?.color ?? "#3B82F6";

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb + tabs */}
      <div
        className="flex-shrink-0 px-5 pt-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={onBack}
            className="text-xs font-sans hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Tables
          </button>
          <ChevronRight className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          <span className="font-mono text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {table.name}
          </span>
          <span className="font-mono text-[10px] ml-2 px-2 py-0.5 rounded" style={{ background: `${accentColor}20`, color: accentColor }}>
            {table.rows.toLocaleString()} rows
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-0.5">
          {(["data", "structure"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-2 text-xs font-sans capitalize transition-colors"
              style={{
                color: activeTab === t ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: activeTab === t ? `2px solid ${accentColor}` : "2px solid transparent",
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
          <DataTable
            columns={USERS_COLUMNS}
            rows={USERS_ROWS}
            totalRows={table.rows}
          />
        )}

        {activeTab === "structure" && (
          <div className="overflow-auto h-full p-5 flex flex-col gap-6">
            {/* Columns */}
            <section>
              <h3
                className="text-[10px] font-semibold uppercase tracking-widest mb-3 font-sans"
                style={{ color: "var(--text-muted)" }}
              >
                Columns
              </h3>
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                <table className="w-full border-collapse text-left">
                  <thead style={{ background: "var(--bg-elevated)" }}>
                    <tr>
                      {["Name", "Type", "Nullable", "Default", "Keys"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider font-sans"
                          style={{
                            color: "var(--text-muted)",
                            borderBottom: "1px solid var(--border-subtle)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {USERS_COLUMNS.map((col, i) => (
                      <tr
                        key={col.name}
                        style={{ borderBottom: i < USERS_COLUMNS.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                        }}
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                            {col.name}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <TypeBadge type={col.type} />
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="font-mono text-xs"
                            style={{ color: col.nullable ? "var(--text-muted)" : "var(--accent-amber)" }}
                          >
                            {col.nullable ? "YES" : "NO"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs italic" style={{ color: "var(--text-muted)" }}>
                            {col.default ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {col.pk && (
                              <span
                                className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)" }}
                              >
                                <Key className="w-3 h-3" /> PK
                              </span>
                            )}
                            {col.fk && (
                              <span
                                className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(139,92,246,0.15)", color: "var(--accent-violet)" }}
                              >
                                <Link2 className="w-3 h-3" /> FK → {col.fk}
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

            {/* Indexes */}
            <section>
              <h3
                className="text-[10px] font-semibold uppercase tracking-widest mb-3 font-sans"
                style={{ color: "var(--text-muted)" }}
              >
                Indexes
              </h3>
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                {INDEXES.map((idx, i) => (
                  <div
                    key={idx.name}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      borderBottom: i < INDEXES.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      {idx.name}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(59,130,246,0.1)", color: "var(--text-code)" }}
                    >
                      {idx.type}
                    </span>
                    {idx.unique && (
                      <span
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(16,185,129,0.1)", color: "var(--accent-green)" }}
                      >
                        UNIQUE
                      </span>
                    )}
                    <span className="font-mono text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                      ({idx.columns.join(", ")})
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Constraints */}
            <section>
              <h3
                className="text-[10px] font-semibold uppercase tracking-widest mb-3 font-sans"
                style={{ color: "var(--text-muted)" }}
              >
                Constraints
              </h3>
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border-subtle)" }}
              >
                {CONSTRAINTS.map((c, i) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      borderBottom: i < CONSTRAINTS.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                      {c.name}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(245,158,11,0.1)", color: "var(--accent-amber)" }}
                    >
                      {c.type}
                    </span>
                    <code className="font-mono text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                      {c.definition}
                    </code>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
