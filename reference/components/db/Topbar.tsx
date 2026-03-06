"use client";
import { Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";
import type { Connection } from "@/lib/mock-data";

interface TopbarProps {
  connections: Connection[];
  activeConnectionId: number;
  onSelectConnection: (id: number) => void;
  onNewConnection: () => void;
}

export function Topbar({
  connections,
  activeConnectionId,
  onSelectConnection,
  onNewConnection,
}: TopbarProps) {
  return (
    <header
      style={{
        height: 48,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
      className="flex items-center px-3 gap-3 flex-shrink-0 select-none"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
          }}
        >
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <span
          className="font-semibold text-sm font-sans"
          style={{ color: "var(--text-primary)" }}
        >
          DBClient
        </span>
      </div>

      {/* Connection tabs */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto min-w-0">
        {connections.map((conn) => {
          const isActive = conn.id === activeConnectionId;
          return (
            <button
              key={conn.id}
              onClick={() => onSelectConnection(conn.id)}
              style={{
                borderBottom: isActive ? `2px solid ${conn.color}` : "2px solid transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                background: isActive ? "var(--bg-elevated)" : "transparent",
              }}
              className={cn(
                "flex items-center gap-2 px-3 h-9 rounded-t text-sm font-sans whitespace-nowrap",
                "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                "transition-all duration-150 flex-shrink-0"
              )}
            >
              <StatusDot status={conn.status} />
              <span className="font-medium">{conn.name}</span>
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--bg-overlay)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {conn.type === "postgres" ? "PG" : "MDB"}
              </span>
            </button>
          );
        })}

        {/* New connection button */}
        <button
          onClick={onNewConnection}
          className="flex items-center gap-1.5 px-3 h-9 rounded text-xs font-sans ml-1 flex-shrink-0"
          style={{
            color: "var(--text-muted)",
            border: "1px dashed var(--border-default)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New connection
        </button>
      </div>

      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ml-auto"
        style={{ background: "var(--accent-blue)", color: "white" }}
      >
        AG
      </div>
    </header>
  );
}
