import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { StatusDot } from "./StatusDot";
import type { Connection } from "../../lib/types";

interface TopbarProps {
  connections: Connection[];
  activeConnectionId: string | null;
  onSelectConnection: (id: string) => void;
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
        height: 60,
        background: "#0E0F1A",
        borderBottom: "1px solid #1E1F32",
      }}
      className="flex items-center px-3 gap-3 flex-shrink-0 select-none"
    >
      {/* Logo */}
      <div className="flex items-center mr-2 flex-shrink-0">
        <img
          src="/branding/logo.png"
          alt="Basalt"
          style={{ height: 56, width: "auto", objectFit: "contain" }}
        />
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
                borderBottom: isActive
                  ? `2px solid ${conn.color}`
                  : "2px solid transparent",
                color: isActive ? "#E8EAFF" : "#8890BB",
                background: isActive ? "#13141F" : "transparent",
              }}
              className={cn(
                "flex items-center gap-2 px-3 h-9 rounded-t text-sm font-sans whitespace-nowrap",
                "hover:bg-basalt-elevated hover:text-basalt-text-primary",
                "transition-all duration-150 flex-shrink-0 cursor-pointer"
              )}
            >
              <StatusDot status={conn.status} />
              <span className="font-medium">{conn.name}</span>
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: "#191A2A",
                  color: "#484A6E",
                  border: "1px solid #1E1F32",
                }}
              >
                PG
              </span>
            </button>
          );
        })}

        {/* New connection button */}
        <button
          onClick={onNewConnection}
          className="flex items-center gap-1.5 px-3 h-9 rounded text-xs font-sans ml-1 flex-shrink-0 cursor-pointer transition-colors hover:text-basalt-text-secondary hover:border-basalt-border-strong"
          style={{
            color: "#484A6E",
            border: "1px dashed #282940",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New connection
        </button>
      </div>
    </header>
  );
}
