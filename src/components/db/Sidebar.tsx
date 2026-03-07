import { useState } from "react";

function getSchema(name: string) {
  return name.includes(".") ? name.split(".", 2)[0] : "public";
}
function getTableOnly(name: string) {
  return name.includes(".") ? name.split(".", 2)[1] : name;
}

import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Copy,
  Trash2,
  Power,
  PowerOff,
  Table2,
  CopyCheck,
  Layers,
  RefreshCw,
  ExternalLink,
  Database,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { StatusDot } from "./StatusDot";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import type { Connection, TableMeta } from "../../lib/types";

interface SidebarProps {
  connections: Connection[];
  tables: TableMeta[];
  tablesLoading?: boolean;
  activeConnectionId: string | null;
  activeTable: string | null;
  onSelectConnection: (id: string) => void;
  onSelectTable: (name: string) => void;
  onEditConnection: (conn: Connection) => void;
  onDeleteConnection: (id: string) => void;
  onToggleConnect: (id: string) => void;
  onRefreshTables: () => void;
}

interface CtxMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export function Sidebar({
  connections,
  tables,
  tablesLoading = false,
  activeConnectionId,
  activeTable,
  onSelectConnection,
  onSelectTable,
  onEditConnection,
  onDeleteConnection,
  onToggleConnect,
  onRefreshTables,
}: SidebarProps) {
  const [connectionsOpen, setConnectionsOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);
  const [openSchemas, setOpenSchemas] = useState<Record<string, boolean>>({});
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group tables by schema
  const schemaMap = new Map<string, TableMeta[]>();
  for (const t of tables) {
    const schema = getSchema(t.name);
    if (!schemaMap.has(schema)) schemaMap.set(schema, []);
    schemaMap.get(schema)!.push(t);
  }
  const schemas = Array.from(schemaMap.keys()).sort();

  const toggleSchema = (schema: string) => {
    setOpenSchemas((prev) => ({ ...prev, [schema]: !prev[schema] }));
  };

  // Auto-open single schema or the one with the active table
  const isSchemaOpen = (schema: string) => {
    if (schema in openSchemas) return openSchemas[schema];
    // default: open if only one schema, or if active table is in it
    if (schemas.length === 1) return true;
    if (activeTable && getSchema(activeTable) === schema) return true;
    return false;
  };

  const openConnCtx = (e: React.MouseEvent, conn: Connection) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Edit connection",
          icon: <Edit2 className="w-3.5 h-3.5" />,
          onClick: () => onEditConnection(conn),
        },
        {
          label: "Copy URI",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => navigator.clipboard.writeText(conn.uri),
        },
        { separator: true },
        conn.status === "connected"
          ? {
              label: "Disconnect",
              icon: <PowerOff className="w-3.5 h-3.5" />,
              onClick: () => onToggleConnect(conn.id),
            }
          : {
              label: "Connect",
              icon: <Power className="w-3.5 h-3.5" />,
              onClick: () => onToggleConnect(conn.id),
            },
        { separator: true },
        {
          label: "Delete connection",
          icon: <Trash2 className="w-3.5 h-3.5" />,
          variant: "destructive",
          onClick: () => setDeletingId(conn.id),
        },
      ],
    });
  };

  const openTableCtx = (e: React.MouseEvent, table: TableMeta) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Open",
          icon: <ExternalLink className="w-3.5 h-3.5" />,
          onClick: () => onSelectTable(table.name),
        },
        {
          label: "Copy name",
          icon: <CopyCheck className="w-3.5 h-3.5" />,
          onClick: () => navigator.clipboard.writeText(table.name),
        },
        {
          label: "View structure",
          icon: <Layers className="w-3.5 h-3.5" />,
          onClick: () => onSelectTable(table.name),
        },
      ],
    });
  };

  const activeConn = connections.find((c) => c.id === activeConnectionId);

  return (
    <>
      <aside
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: 224,
          background: "#0E0F1A",
          borderRight: "1px solid #1E1F32",
        }}
      >
        {/* ── Connections ── */}
        <div className="flex-shrink-0">
          <button
            className="w-full flex items-center gap-1.5 px-3 py-2.5 cursor-pointer"
            onClick={() => setConnectionsOpen((v) => !v)}
            style={{ color: "#484A6E" }}
          >
            {connectionsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="text-[10px] font-semibold tracking-widest uppercase font-sans">
              Connections
            </span>
          </button>

          {connectionsOpen && (
            <div className="pb-1">
              {connections.length === 0 && (
                <p className="text-[11px] font-sans px-4 py-2 text-basalt-text-muted">
                  No connections yet
                </p>
              )}
              {connections.map((conn) => {
                const isActive = conn.id === activeConnectionId;
                if (deletingId === conn.id) {
                  return (
                    <div
                      key={conn.id}
                      className="mx-2 mb-1 rounded-md p-2.5"
                      style={{
                        background: "#13141F",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      <p className="text-xs font-sans mb-2" style={{ color: "#8890BB" }}>
                        Delete{" "}
                        <span style={{ color: "#E8EAFF" }}>{conn.name}</span>?
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          className="flex-1 text-xs py-1 rounded font-sans cursor-pointer"
                          style={{ background: "#191A2A", color: "#8890BB" }}
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="flex-1 text-xs py-1 rounded font-sans cursor-pointer"
                          style={{ background: "#EF4444", color: "white" }}
                          onClick={() => {
                            onDeleteConnection(conn.id);
                            setDeletingId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={conn.id}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left group cursor-pointer",
                      "hover:bg-basalt-elevated transition-colors duration-100"
                    )}
                    style={{
                      borderLeft: isActive
                        ? `2px solid ${conn.color}`
                        : "2px solid transparent",
                      background: isActive ? "#13141F" : "transparent",
                      color: isActive ? "#E8EAFF" : "#8890BB",
                    }}
                    onClick={() => onSelectConnection(conn.id)}
                    onContextMenu={(e) => openConnCtx(e, conn)}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: conn.color }}
                    />
                    <span className="text-sm font-sans flex-1 truncate">
                      {conn.name}
                    </span>
                    <StatusDot status={conn.status} className="flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px flex-shrink-0" style={{ background: "#1E1F32" }} />

        {/* ── Tables section ── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Section header */}
          <button
            className="w-full flex items-center gap-1.5 px-3 py-2.5 flex-shrink-0 cursor-pointer"
            onClick={() => setTablesOpen((v) => !v)}
          >
            {tablesOpen ? (
              <ChevronDown className="w-3 h-3" style={{ color: "#484A6E" }} />
            ) : (
              <ChevronRight className="w-3 h-3" style={{ color: "#484A6E" }} />
            )}
            <span
              className="text-[10px] font-semibold tracking-widest uppercase font-sans"
              style={{ color: "#E8EAFF" }}
            >
              {activeConn?.type === "mongodb" ? "Databases" : "Tables"}
            </span>
            {activeConn && (
              <span
                className="ml-auto text-[9px] font-mono rounded px-1.5 py-0.5"
                style={{
                  background: `${activeConn.color}20`,
                  color: activeConn.color,
                }}
              >
                {tables.length}
              </span>
            )}
            {activeConn && (
              <button
                className="ml-1 p-0.5 rounded hover:bg-basalt-elevated cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshTables();
                }}
                title="Refresh tables"
              >
                <RefreshCw className="w-3 h-3" style={{ color: "#484A6E" }} />
              </button>
            )}
          </button>

          {tablesOpen && (
            <div className="overflow-y-auto flex-1">
              {/* Skeleton while loading */}
              {tablesLoading && (
                <div className="px-3 py-2 flex flex-col gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-6 rounded"
                      style={{
                        background: "linear-gradient(90deg, #13141F 0%, #1E1F32 50%, #13141F 100%)",
                        backgroundSize: "200% 100%",
                        animation: `skeletonShimmer 1.4s ease-in-out ${i * 0.07}s infinite`,
                        width: `${68 + (i % 3) * 12}%`,
                      }}
                    />
                  ))}
                </div>
              )}

              {!tablesLoading && tables.length === 0 && activeConn && (
                <p className="text-[11px] font-sans px-4 py-2 text-basalt-text-muted">
                  No tables found
                </p>
              )}

              {/* Grouped by schema */}
              {!tablesLoading && schemas.map((schema) => {
                const schemaTables = schemaMap.get(schema)!;
                const open = isSchemaOpen(schema);
                return (
                  <div key={schema}>
                    {/* Schema header */}
                    <button
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-basalt-elevated transition-colors"
                      onClick={() => toggleSchema(schema)}
                    >
                      {open ? (
                        <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: "#484A6E" }} />
                      ) : (
                        <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "#484A6E" }} />
                      )}
                      <Database className="w-3 h-3 flex-shrink-0" style={{ color: "#484A6E" }} />
                      <span
                        className="text-[11px] font-mono font-medium truncate"
                        style={{ color: "#8890BB" }}
                      >
                        {schema}
                      </span>
                      <span
                        className="ml-auto text-[9px] font-mono flex-shrink-0"
                        style={{ color: "#3A3B58" }}
                      >
                        {schemaTables.length}
                      </span>
                    </button>

                    {/* Tables inside schema */}
                    {open &&
                      schemaTables.map((table) => {
                        const isActive = table.name === activeTable;
                        return (
                          <button
                            key={table.name}
                            className={cn(
                              "w-full flex items-center gap-2 pl-7 pr-3 py-1.5 text-left group cursor-pointer",
                              "hover:bg-basalt-elevated transition-colors duration-100"
                            )}
                            style={{
                              borderLeft:
                                isActive && activeConn
                                  ? `2px solid ${activeConn.color}`
                                  : "2px solid transparent",
                              background: isActive ? "#13141F" : "transparent",
                            }}
                            onClick={() => onSelectTable(table.name)}
                            onContextMenu={(e) => openTableCtx(e, table)}
                          >
                            <Table2
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{
                                color:
                                  isActive && activeConn
                                    ? activeConn.color
                                    : "#484A6E",
                              }}
                            />
                            <span
                              className="font-mono text-xs flex-1 truncate"
                              style={{
                                color: isActive ? "#E8EAFF" : "#8890BB",
                              }}
                            >
                              {getTableOnly(table.name)}
                            </span>
                            <span
                              className="font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              style={{ color: "#484A6E" }}
                            >
                              {table.row_count.toLocaleString()}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
