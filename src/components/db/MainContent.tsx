import { Table2, GitBranch, Terminal } from "lucide-react";
import { TablesGrid } from "./TablesGrid";
import { TableDetail } from "./TableDetail";
import { RelationsView } from "./RelationsView";
import { QueryEditor } from "./QueryEditor";
import { ErrorBoundary } from "../ErrorBoundary";
import type { Connection, TableMeta } from "../../lib/types";

export type NavTab = "tables" | "relations" | "query";

interface MainContentProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeTable: string | null;
  activeTabId: string | null;
  onOpenTable: (name: string) => void;
  onCloseTab: (id: string) => void;
  connection: Connection | null;
  tables: TableMeta[];
  tablesLoading?: boolean;
}

const NAV_TABS: { id: NavTab; label: string; icon: React.ReactNode }[] = [
  { id: "tables",    label: "Tables",       icon: <Table2    className="w-3.5 h-3.5" /> },
  { id: "relations", label: "Relations",    icon: <GitBranch className="w-3.5 h-3.5" /> },
  { id: "query",     label: "Query Editor", icon: <Terminal  className="w-3.5 h-3.5" /> },
];

export function MainContent({
  activeTab,
  onTabChange,
  activeTable,
  activeTabId,
  onOpenTable,
  onCloseTab,
  connection,
  tables,
  tablesLoading = false,
}: MainContentProps) {
  const table = tables.find((t) => t.name === activeTable);
  const accentColor = connection?.color ?? "#4F7EE8";

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Nav strip */}
      <nav
        className="flex items-center gap-0.5 px-4 flex-shrink-0"
        style={{
          height: 40,
          background: "#0E0F1A",
          borderBottom: "1px solid #1E1F32",
        }}
      >
        {NAV_TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="flex items-center gap-2 px-3 h-full text-xs font-sans transition-colors cursor-pointer"
              style={{
                color: isActive ? "#E8EAFF" : "#484A6E",
                borderBottom: isActive
                  ? `2px solid ${accentColor}`
                  : "2px solid transparent",
              }}
            >
              <span style={{ color: isActive ? accentColor : "#484A6E" }}>
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ErrorBoundary label="Content area">
          {activeTab === "tables" && (() => {
            // While fetching tables for a new connection, show skeleton grid
            if (tablesLoading) {
              return (
                <TablesGrid
                  tables={[]}
                  activeConnection={connection}
                  onOpenTable={onOpenTable}
                  loading={true}
                />
              );
            }
            // A table tab is selected and the table is found in the current list
            if (activeTable && table) {
              return (
                <TableDetail
                  table={table}
                  connection={connection}
                  onBack={() => activeTabId && onCloseTab(activeTabId)}
                />
              );
            }
            // No active table tab → show the tables overview grid
            return (
              <TablesGrid
                tables={tables}
                activeConnection={connection}
                onOpenTable={onOpenTable}
                loading={false}
              />
            );
          })()}

          {activeTab === "relations" && (
            <RelationsView connection={connection} />
          )}

          {activeTab === "query" && (
            <QueryEditor connection={connection} tables={tables} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
