"use client";
import { useState } from "react";
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
  Scissors,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import type { Connection, TableMeta } from "@/lib/mock-data";

interface SidebarProps {
  connections: Connection[];
  tables: TableMeta[];
  activeConnectionId: number;
  activeTable: string | null;
  onSelectConnection: (id: number) => void;
  onSelectTable: (name: string) => void;
  onEditConnection: (conn: Connection) => void;
  onDeleteConnection: (id: number) => void;
  onToggleConnect: (id: number) => void;
}

interface CtxMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export function Sidebar({
  connections,
  tables,
  activeConnectionId,
  activeTable,
  onSelectConnection,
  onSelectTable,
  onEditConnection,
  onDeleteConnection,
  onToggleConnect,
}: SidebarProps) {
  const [connectionsOpen, setConnectionsOpen] = useState(true);
  const [tablesOpen, setTablesOpen] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
          label: "Duplicate",
          icon: <Copy className="w-3.5 h-3.5" />,
          onClick: () => {},
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
        { separator: true },
        {
          label: "Truncate table",
          icon: <Scissors className="w-3.5 h-3.5" />,
          variant: "destructive",
          onClick: () => {},
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
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Connections section */}
        <div className="flex-shrink-0">
          <button
            className="w-full flex items-center gap-1.5 px-3 py-2.5"
            onClick={() => setConnectionsOpen((v) => !v)}
            style={{ color: "var(--text-muted)" }}
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
              {connections.map((conn) => {
                const isActive = conn.id === activeConnectionId;
                if (deletingId === conn.id) {
                  return (
                    <div
                      key={conn.id}
                      className="mx-2 mb-1 rounded-md p-2.5"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent-red)30" }}
                    >
                      <p className="text-xs font-sans mb-2" style={{ color: "var(--text-secondary)" }}>
                        Delete <span style={{ color: "var(--text-primary)" }}>{conn.name}</span>? Cannot be undone.
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          className="flex-1 text-xs py-1 rounded font-sans"
                          style={{ background: "var(--bg-overlay)", color: "var(--text-secondary)" }}
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="flex-1 text-xs py-1 rounded font-sans"
                          style={{ background: "var(--accent-red)", color: "white" }}
                          onClick={() => { onDeleteConnection(conn.id); setDeletingId(null); }}
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
                      "w-full flex items-center gap-2 px-3 py-2 text-left group",
                      "hover:bg-[var(--bg-elevated)] transition-colors duration-100"
                    )}
                    style={{
                      borderLeft: isActive ? `2px solid ${conn.color}` : "2px solid transparent",
                      background: isActive ? "var(--bg-elevated)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                    onClick={() => onSelectConnection(conn.id)}
                    onContextMenu={(e) => openConnCtx(e, conn)}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: conn.color }}
                    />
                    <span className="text-sm font-sans flex-1 truncate">{conn.name}</span>
                    <span
                      className="font-mono text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        background: "var(--bg-overlay)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {conn.type === "postgres" ? "PG" : "MDB"}
                    </span>
                    <StatusDot status={conn.status} className="flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px mx-0" style={{ background: "var(--border-subtle)" }} />

        {/* Tables section */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <button
            className="w-full flex items-center gap-1.5 px-3 py-2.5 flex-shrink-0"
            onClick={() => setTablesOpen((v) => !v)}
            style={{ color: "var(--text-muted)" }}
          >
            {tablesOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="text-[10px] font-semibold tracking-widest uppercase font-sans">
              Tables
            </span>
            {activeConn && (
              <span
                className="ml-auto text-[9px] font-mono rounded px-1.5 py-0.5"
                style={{
                  background: `${activeConn.color}20`,
                  color: activeConn.color,
                }}
              >
                {activeConn.name}
              </span>
            )}
          </button>

          {tablesOpen && (
            <div className="overflow-y-auto flex-1">
              {tables.map((table) => {
                const isActive = table.name === activeTable;
                return (
                  <button
                    key={table.name}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-left group",
                      "hover:bg-[var(--bg-elevated)] transition-colors duration-100"
                    )}
                    style={{
                      borderLeft: isActive && activeConn
                        ? `2px solid ${activeConn.color}`
                        : "2px solid transparent",
                      background: isActive ? "var(--bg-elevated)" : "transparent",
                    }}
                    onClick={() => onSelectTable(table.name)}
                    onContextMenu={(e) => openTableCtx(e, table)}
                  >
                    <Table2
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: isActive && activeConn ? activeConn.color : "var(--text-muted)" }}
                    />
                    <span
                      className="font-mono text-xs flex-1 truncate"
                      style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {table.name}
                    </span>
                    <span
                      className="font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {table.rows.toLocaleString()}
                    </span>
                    <span
                      className="font-mono text-[10px] group-hover:hidden"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {table.rows >= 1000
                        ? `${(table.rows / 1000).toFixed(0)}k`
                        : table.rows}
                    </span>
                  </button>
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
