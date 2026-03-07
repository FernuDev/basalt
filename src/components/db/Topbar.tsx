import { X, Plus, Table2, Layers } from "lucide-react";
import type { OpenTab } from "../../App";

interface TopbarProps {
  openTabs: OpenTab[];
  activeTabId: string | null;
  onSelectTab: (tab: OpenTab) => void;
  onCloseTab: (id: string) => void;
  onNewConnection: () => void;
}

export function Topbar({
  openTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewConnection,
}: TopbarProps) {
  return (
    <header
      className="flex items-stretch flex-shrink-0 select-none"
      style={{
        height: 48,
        background: "#0A0B13",
        borderBottom: "1px solid #1E1F32",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-3 flex-shrink-0"
        style={{ borderRight: "1px solid #1E1F32" }}
      >
        <img
          src="/branding/logo.png"
          alt="Basalt"
          style={{ height: 60, width: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Tab list */}
      <div className="flex items-stretch flex-1 overflow-x-auto min-w-0" style={{ scrollbarWidth: "none" }}>
        {openTabs.length === 0 ? (
          <div className="flex items-center px-4">
            <span
              className="text-xs font-sans italic"
              style={{ color: "#3A3B58" }}
            >
              Open a table or collection from the sidebar
            </span>
          </div>
        ) : (
          openTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isMongo = tab.connectionType === "mongodb";

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab)}
                className="group relative flex items-center gap-2 px-3 flex-shrink-0 transition-colors cursor-pointer"
                style={{
                  background: isActive ? "#0E0F1A" : "transparent",
                  borderRight: "1px solid #1E1F32",
                  borderBottom: isActive
                    ? `2px solid ${tab.connectionColor}`
                    : "2px solid transparent",
                  minWidth: 120,
                  maxWidth: 200,
                }}
              >
                {/* DB type badge */}
                <span
                  className="font-mono text-[9px] px-1 py-0.5 rounded flex-shrink-0"
                  style={{
                    background: isMongo
                      ? "rgba(16,185,129,0.15)"
                      : `${tab.connectionColor}20`,
                    color: isMongo ? "#10B981" : tab.connectionColor,
                    border: `1px solid ${isMongo ? "rgba(16,185,129,0.25)" : tab.connectionColor + "40"}`,
                  }}
                >
                  {isMongo ? "MG" : "PG"}
                </span>

                {/* Icon */}
                {isMongo ? (
                  <Layers
                    className="w-3 h-3 flex-shrink-0"
                    style={{ color: isActive ? tab.connectionColor : "#484A6E" }}
                  />
                ) : (
                  <Table2
                    className="w-3 h-3 flex-shrink-0"
                    style={{ color: isActive ? tab.connectionColor : "#484A6E" }}
                  />
                )}

                {/* Label */}
                <span
                  className="font-mono text-xs truncate flex-1 text-left"
                  style={{ color: isActive ? "#E8EAFF" : "#8890BB" }}
                >
                  {tab.label}
                </span>

                {/* Close button */}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-all cursor-pointer
                    opacity-0 group-hover:opacity-100"
                  style={{ color: "#484A6E" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)";
                    (e.currentTarget as HTMLElement).style.color = "#EF4444";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#484A6E";
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Right actions */}
      <div
        className="flex items-center px-3 flex-shrink-0 gap-2"
        style={{ borderLeft: "1px solid #1E1F32" }}
      >
        <button
          onClick={onNewConnection}
          title="New connection"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-sans cursor-pointer transition-colors"
          style={{
            color: "#484A6E",
            border: "1px dashed #282940",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#8890BB";
            (e.currentTarget as HTMLElement).style.borderColor = "#484A6E";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#484A6E";
            (e.currentTarget as HTMLElement).style.borderColor = "#282940";
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>
    </header>
  );
}
