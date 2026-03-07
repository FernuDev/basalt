import { useState } from "react";
import { Table2, ExternalLink, ChevronDown, ChevronRight, Database } from "lucide-react";
import type { TableMeta, Connection } from "../../lib/types";

function getSchema(name: string) {
  return name.includes(".") ? name.split(".", 2)[0] : "public";
}
function getTableOnly(name: string) {
  return name.includes(".") ? name.split(".", 2)[1] : name;
}

interface TablesGridProps {
  tables: TableMeta[];
  activeConnection: Connection | null;
  onOpenTable: (name: string) => void;
  loading?: boolean;
}

export function TablesGrid({ tables, activeConnection, onOpenTable, loading = false }: TablesGridProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [openSchemas, setOpenSchemas] = useState<Record<string, boolean>>({});

  const isMongo = activeConnection?.type === "mongodb";

  const accentColor = activeConnection?.color ?? "#7C4FD4";

  // Group by schema
  const schemaMap = new Map<string, TableMeta[]>();
  for (const t of tables) {
    const schema = getSchema(t.name);
    if (!schemaMap.has(schema)) schemaMap.set(schema, []);
    schemaMap.get(schema)!.push(t);
  }
  const schemas = Array.from(schemaMap.keys()).sort();

  const isSchemaOpen = (schema: string) => {
    if (schema in openSchemas) return openSchemas[schema];
    return true; // default open
  };

  const toggleSchema = (schema: string) =>
    setOpenSchemas((prev) => ({ ...prev, [schema]: !isSchemaOpen(schema) }));

  if (!activeConnection) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <Table2 className="w-12 h-12" style={{ color: "#282940" }} />
        <div className="text-center">
          <p className="text-sm font-sans" style={{ color: "#8890BB" }}>
            No connection selected
          </p>
          <p className="text-xs font-sans mt-1" style={{ color: "#484A6E" }}>
            Connect to a database to browse tables
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #1E1F32" }}
      >
        <div>
          <h1 className="text-sm font-semibold font-sans" style={{ color: "#E8EAFF" }}>
            {isMongo ? "Collections" : "Tables"}
          </h1>
          <p className="text-xs font-mono mt-0.5" style={{ color: "#484A6E" }}>
            {activeConnection.name}
            {activeConnection.version && ` · ${activeConnection.version}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs px-2 py-1 rounded"
            style={{ background: `${accentColor}20`, color: accentColor }}
          >
            {tables.length} {isMongo ? "collections" : "tables"}
          </span>
          <span
            className="font-mono text-xs px-2 py-1 rounded"
            style={{ background: "#13141F", color: "#484A6E", border: "1px solid #1E1F32" }}
          >
            {schemas.length} {isMongo ? "databases" : "schemas"}
          </span>
        </div>
      </div>

      {/* Schemas + tables */}
      <div className="flex-1 overflow-auto p-5 flex flex-col gap-6">
        {/* Skeleton grid while loading */}
        {loading && (
          <>
            {/* Skeleton schema header */}
            <div className="flex flex-col gap-4">
              {[8, 6].map((count, gi) => (
                <div key={gi} className="flex flex-col gap-3">
                  <div
                    className="h-8 rounded-lg w-40"
                    style={{
                      background: "linear-gradient(90deg, #13141F 0%, #1E1F32 50%, #13141F 100%)",
                      backgroundSize: "200% 100%",
                      animation: "skeletonShimmer 1.4s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))" }}
                  >
                    {Array.from({ length: count }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl p-4 flex flex-col gap-2"
                        style={{
                          background: "#13141F",
                          border: "1px solid #1E1F32",
                          animationDelay: `${i * 0.05}s`,
                        }}
                      >
                        {/* Icon placeholder */}
                        <div
                          className="w-9 h-9 rounded-lg mb-1"
                          style={{
                            background: "linear-gradient(90deg, #1E1F32 0%, #282940 50%, #1E1F32 100%)",
                            backgroundSize: "200% 100%",
                            animation: `skeletonShimmer 1.4s ease-in-out ${i * 0.06}s infinite`,
                          }}
                        />
                        {/* Name placeholder */}
                        <div
                          className="h-3.5 rounded"
                          style={{
                            width: `${55 + (i % 4) * 10}%`,
                            background: "linear-gradient(90deg, #1E1F32 0%, #282940 50%, #1E1F32 100%)",
                            backgroundSize: "200% 100%",
                            animation: `skeletonShimmer 1.4s ease-in-out ${i * 0.06 + 0.1}s infinite`,
                          }}
                        />
                        {/* Row count placeholder */}
                        <div
                          className="h-2.5 rounded"
                          style={{
                            width: "40%",
                            background: "linear-gradient(90deg, #1E1F32 0%, #282940 50%, #1E1F32 100%)",
                            backgroundSize: "200% 100%",
                            animation: `skeletonShimmer 1.4s ease-in-out ${i * 0.06 + 0.2}s infinite`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Table2 className="w-10 h-10" style={{ color: "#282940" }} />
            <p className="text-sm font-sans" style={{ color: "#484A6E" }}>
              No tables in this database
            </p>
          </div>
        ) : !loading && (
          schemas.map((schema) => {
            const schemaTables = schemaMap.get(schema)!;
            const open = isSchemaOpen(schema);
            return (
              <section key={schema}>
                {/* Schema header */}
                <button
                  className="flex items-center gap-2 mb-3 group cursor-pointer w-full text-left"
                  onClick={() => toggleSchema(schema)}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: open ? "#191A2A" : "#13141F",
                      border: "1px solid #1E1F32",
                    }}
                  >
                    <Database className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span
                      className="font-mono text-xs font-semibold"
                      style={{ color: "#E8EAFF" }}
                    >
                      {schema}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: `${accentColor}20`,
                        color: accentColor,
                      }}
                    >
                      {schemaTables.length}
                    </span>
                  </div>
                  {open ? (
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: "#484A6E" }} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: "#484A6E" }} />
                  )}
                </button>

                {/* Tables grid */}
                {open && (
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
                    }}
                  >
                    {schemaTables.map((table) => {
                      const isHovered = hoveredTable === table.name;
                      return (
                        <button
                          key={table.name}
                          className="relative text-left flex flex-col p-4 rounded-xl transition-all duration-150 cursor-pointer"
                          style={{
                            background: isHovered ? "#191A2A" : "#13141F",
                            border: `1px solid ${isHovered ? accentColor + "40" : "#1E1F32"}`,
                            transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                            boxShadow: isHovered
                              ? `0 6px 20px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}20`
                              : "none",
                          }}
                          onMouseEnter={() => setHoveredTable(table.name)}
                          onMouseLeave={() => setHoveredTable(null)}
                          onClick={() => onOpenTable(table.name)}
                        >
                          {isHovered && (
                            <div className="absolute top-2 right-2">
                              <span
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans"
                                style={{
                                  background: `${accentColor}20`,
                                  color: accentColor,
                                  border: `1px solid ${accentColor}40`,
                                }}
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                Open
                              </span>
                            </div>
                          )}

                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                            style={{
                              background: `${accentColor}18`,
                              border: `1px solid ${accentColor}30`,
                            }}
                          >
                            <Table2 className="w-4 h-4" style={{ color: accentColor }} />
                          </div>

                          <span
                            className="font-mono text-sm font-medium block mb-1 truncate w-full"
                            style={{ color: "#E8EAFF" }}
                          >
                            {getTableOnly(table.name)}
                          </span>

                          <span className="font-mono text-xs block" style={{ color: "#484A6E" }}>
                            {table.row_count.toLocaleString()} rows
                          </span>
                          <span
                            className="font-mono text-[10px] block mt-0.5"
                            style={{ color: "#3A3B58" }}
                          >
                            {table.size}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
