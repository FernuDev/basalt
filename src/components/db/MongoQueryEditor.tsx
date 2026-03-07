import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Download,
  XCircle,
  Database,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "./DataTable";
import { mongo } from "../../lib/db";
import type { Connection, QueryResult, TableMeta } from "../../lib/types";

// ── JSON syntax highlight ─────────────────────────────────────────────────────
function highlightJSON(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = [];
    let i = 0;

    const push = (text: string, color: string, key: string) =>
      parts.push(<span key={key} style={{ color }}>{text}</span>);

    while (i < line.length) {
      // String
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && (line[j] !== '"' || line[j - 1] === "\\")) j++;
        j++;
        const token = line.slice(i, j);
        // Keys (followed by colon) are lighter, values are green
        const isKey = line.slice(j).trimStart().startsWith(":");
        push(token, isKey ? "#A5B4FC" : "#34D399", `${li}-s-${i}`);
        i = j;
        continue;
      }
      // Numbers
      const numMatch = line.slice(i).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (numMatch) {
        push(numMatch[0], "#F59E0B", `${li}-n-${i}`);
        i += numMatch[0].length;
        continue;
      }
      // Booleans / null
      const kwMatch = line.slice(i).match(/^(true|false|null)/);
      if (kwMatch) {
        push(kwMatch[0], "#9D6FE8", `${li}-k-${i}`);
        i += kwMatch[0].length;
        continue;
      }
      // Punctuation
      if ("{}[]:,".includes(line[i])) {
        push(line[i], "#8890BB", `${li}-p-${i}`);
        i++;
        continue;
      }
      push(line[i], "#8890BB", `${li}-x-${i}`);
      i++;
    }

    return (
      <div key={li} style={{ minHeight: "1.75em", lineHeight: "1.75" }}>
        {parts}
        {"\n"}
      </div>
    );
  });
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(columns: string[], rows: unknown[][]) {
  const header = columns.join(",");
  const body = rows
    .map((r) =>
      r.map((v) => (v === null ? "" : `"${String(v).replace(/"/g, '""')}"`)).join(",")
    )
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mongo_result_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
type RunStatus = "idle" | "running" | "success" | "error";
type Operation = "find" | "count" | "aggregate";

const SAMPLE_FIND = `{}`;
const SAMPLE_AGGREGATE = `[\n  { "$match": {} },\n  { "$limit": 50 }\n]`;

interface MongoQueryEditorProps {
  connection: Connection;
  tables: TableMeta[]; // used to populate collection selector
}

export function MongoQueryEditor({ connection, tables }: MongoQueryEditorProps) {
  const [operation, setOperation] = useState<Operation>("find");
  const [collection, setCollection] = useState<string>("");
  const [query, setQuery] = useState(SAMPLE_FIND);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [splitRatio, setSplitRatio] = useState(42);
  const [showOpMenu, setShowOpMenu] = useState(false);
  const [showCollMenu, setShowCollMenu] = useState(false);
  const [activeLine, setActiveLine] = useState(1);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const accentColor = connection.color;
  const lineHeight = 1.75 * 13;
  const lines = query.split("\n");
  const lineCount = lines.length;

  // Auto-select first collection
  useEffect(() => {
    if (tables.length > 0 && !collection) {
      setCollection(tables[0].name);
    }
  }, [tables]);

  // Update sample when operation changes
  useEffect(() => {
    setQuery(operation === "aggregate" ? SAMPLE_AGGREGATE : SAMPLE_FIND);
  }, [operation]);

  // Close menus on outside click
  useEffect(() => {
    if (!showOpMenu && !showCollMenu) return;
    const close = () => { setShowOpMenu(false); setShowCollMenu(false); };
    document.addEventListener("mousedown", close, { once: true });
    return () => document.removeEventListener("mousedown", close);
  }, [showOpMenu, showCollMenu]);

  const updateCursor = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const text = ta.value.slice(0, ta.selectionStart);
    const linesBefore = text.split("\n");
    const line = linesBefore.length;
    const col = linesBefore[linesBefore.length - 1].length + 1;
    setCursorPos({ line, col });
    setActiveLine(line);
  };

  const syncScroll = () => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    const ln = lineNumRef.current;
    if (!ta) return;
    if (ov) { ov.scrollTop = ta.scrollTop; ov.scrollLeft = ta.scrollLeft; }
    if (ln) ln.scrollTop = ta.scrollTop;
  };

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setQuery(query.slice(0, start) + "  " + query.slice(end));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  const runQuery = useCallback(async () => {
    if (!collection) { toast.error("Select a collection first"); return; }
    const trimmed = query.trim();
    if (!trimmed) return;
    setRunStatus("running");
    setErrorMsg("");
    try {
      const result = await mongo.executeQuery(connection.id, collection, trimmed, operation);
      setQueryResult(result);
      setRunStatus("success");
    } catch (err) {
      setErrorMsg(String(err));
      setRunStatus("error");
    }
  }, [connection.id, collection, query, operation]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setSplitRatio(Math.min(78, Math.max(18, pct)));
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp, { once: true });
    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", onMove), { once: true });
  }, []);

  // Group tables by database for the collection selector
  const dbMap = new Map<string, string[]>();
  for (const t of tables) {
    const [dbName] = t.name.includes(".") ? t.name.split(".", 2) : ["default", t.name];
    if (!dbMap.has(dbName)) dbMap.set(dbName, []);
    dbMap.get(dbName)!.push(t.name);
  }

  const collectionLabel = collection
    ? (collection.includes(".") ? collection.split(".", 2)[1] : collection)
    : "Select collection";

  const OPERATIONS: { id: Operation; label: string }[] = [
    { id: "find",      label: "find({})" },
    { id: "count",     label: "count({})" },
    { id: "aggregate", label: "aggregate([...])" },
  ];

  return (
    <div ref={containerRef} className="flex flex-col h-full" style={{ background: "#0A0B13" }}>

      {/* ── Editor pane ── */}
      <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ height: `${splitRatio}%` }}>

        {/* Toolbar */}
        <div
          className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
          style={{ background: "#0E0F1A", borderBottom: "1px solid #1E1F32" }}
        >
          {/* Run */}
          <button
            onClick={runQuery}
            disabled={runStatus === "running" || !collection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-semibold cursor-pointer disabled:opacity-40 transition-all"
            style={{
              background: "linear-gradient(135deg, #10B981, #059669)",
              color: "white",
              boxShadow: runStatus === "running" ? "none" : "0 0 12px rgba(16,185,129,0.3)",
            }}
          >
            {runStatus === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            Run
            <kbd className="ml-1 font-mono text-[10px] opacity-80 px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.15)" }}>⌘↵</kbd>
          </button>

          {/* Collection selector */}
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowCollMenu((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono cursor-pointer"
              style={{ color: collection ? "#E8EAFF" : "#484A6E", border: "1px solid #282940", background: "#13141F" }}
            >
              <Database className="w-3 h-3 flex-shrink-0" style={{ color: "#10B981" }} />
              {collectionLabel}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCollMenu && (
              <div
                className="absolute top-full mt-1 left-0 z-50 rounded-md overflow-hidden py-1"
                style={{ background: "#191A2A", border: "1px solid #282940", minWidth: 200, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
              >
                {Array.from(dbMap.entries()).map(([dbName, colls]) => (
                  <div key={dbName}>
                    <div className="px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase" style={{ color: "#484A6E", background: "#13141F" }}>
                      {dbName}
                    </div>
                    {colls.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCollection(c); setShowCollMenu(false); }}
                        className="w-full text-left px-4 py-1.5 text-xs font-mono cursor-pointer"
                        style={{
                          color: collection === c ? "#E8EAFF" : "#8890BB",
                          background: collection === c ? "#252640" : "transparent",
                        }}
                      >
                        {c.includes(".") ? c.split(".", 2)[1] : c}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operation selector */}
          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowOpMenu((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono cursor-pointer"
              style={{ color: "#8890BB", border: "1px solid #282940", background: "#13141F" }}
            >
              {OPERATIONS.find((o) => o.id === operation)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showOpMenu && (
              <div
                className="absolute top-full mt-1 left-0 z-50 rounded-md overflow-hidden py-1"
                style={{ background: "#191A2A", border: "1px solid #282940", minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
              >
                {OPERATIONS.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => { setOperation(op.id); setShowOpMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs font-mono cursor-pointer"
                    style={{
                      color: operation === op.id ? "#E8EAFF" : "#8890BB",
                      background: operation === op.id ? "#252640" : "transparent",
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Connection badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35`, color: accentColor }}
          >
            <Database className="w-3 h-3" />
            {connection.name}
          </div>
        </div>

        {/* JSON editor */}
        <div className="flex flex-1 overflow-hidden relative" style={{ background: "#0A0B13" }}>
          {/* Line numbers */}
          <div
            ref={lineNumRef}
            className="flex-shrink-0 select-none overflow-hidden"
            style={{
              width: 48,
              paddingTop: 14,
              paddingRight: 10,
              background: "#0E0F1A",
              borderRight: "1px solid #1E1F32",
              fontFamily: '"Geist Mono", monospace',
              fontSize: 12,
              lineHeight: `${lineHeight}px`,
              textAlign: "right",
              overflowY: "hidden",
            }}
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <div
                key={i}
                style={{
                  color: i + 1 === activeLine ? "#8890BB" : "#3A3B58",
                  background: i + 1 === activeLine ? "rgba(16,185,129,0.06)" : "transparent",
                  paddingRight: 10,
                  lineHeight: `${lineHeight}px`,
                  height: lineHeight,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden">
            {/* Active line highlight */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 14 + (activeLine - 1) * lineHeight,
                left: 0, right: 0,
                height: lineHeight,
                background: "rgba(16,185,129,0.04)",
                borderLeft: "2px solid rgba(16,185,129,0.25)",
              }}
            />

            {/* JSON syntax overlay */}
            <pre
              ref={overlayRef}
              className="absolute inset-0 pointer-events-none"
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 13,
                lineHeight: `${lineHeight}px`,
                padding: "14px 16px",
                margin: 0,
                whiteSpace: "pre",
                overflow: "hidden",
                wordSpacing: "normal",
                letterSpacing: "normal",
              }}
              aria-hidden="true"
            >
              {highlightJSON(query)}
            </pre>

            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); updateCursor(); }}
              onKeyDown={handleTab}
              onKeyUp={updateCursor}
              onClick={updateCursor}
              onScroll={syncScroll}
              spellCheck={false}
              className="absolute inset-0 w-full h-full resize-none outline-none bg-transparent"
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 13,
                lineHeight: `${lineHeight}px`,
                padding: "14px 16px",
                color: "transparent",
                caretColor: "#10B981",
                whiteSpace: "pre",
                tabSize: 2,
                overflowY: "auto",
                overflowX: "auto",
                boxSizing: "border-box",
                border: "none",
                wordSpacing: "normal",
                letterSpacing: "normal",
              }}
            />
          </div>
        </div>

        {/* Status bar */}
        <div
          className="flex items-center gap-4 px-3 flex-shrink-0"
          style={{ height: 24, background: "#0E0F1A", borderTop: "1px solid #1E1F32" }}
        >
          <span className="font-mono text-[10px]" style={{ color: "#3A3B58" }}>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="font-mono text-[10px] ml-auto" style={{ color: "#3A3B58" }}>MongoDB · {operation}</span>
        </div>
      </div>

      {/* ── Drag handle ── */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-center flex-shrink-0 cursor-row-resize group"
        style={{ height: 6, background: "#0E0F1A", borderTop: "1px solid #1E1F32", borderBottom: "1px solid #1E1F32" }}
      >
        <div className="w-12 h-0.5 rounded-full transition-all group-hover:w-20" style={{ background: "#282940" }} />
      </div>

      {/* ── Results pane ── */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#0E0F1A" }}>
        {(runStatus === "success" || runStatus === "error" || runStatus === "running") && (
          <div
            className="flex items-center gap-3 px-4 flex-shrink-0"
            style={{ height: 34, borderBottom: "1px solid #1E1F32", background: "#0A0B13" }}
          >
            <span className="text-[10px] font-semibold font-sans tracking-widest uppercase" style={{ color: "#484A6E" }}>Results</span>
            {runStatus === "success" && queryResult && (
              <>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}>
                  {queryResult.row_count.toLocaleString()} {operation === "count" ? "count" : "docs"}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: "rgba(79,126,232,0.1)", color: "#4F7EE8", border: "1px solid rgba(79,126,232,0.2)" }}>
                  {queryResult.execution_time_ms}ms
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => exportCSV(queryResult.columns, queryResult.rows as unknown[][])}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-sans cursor-pointer transition-colors"
                  style={{ color: "#484A6E", border: "1px solid #1E1F32" }}
                >
                  <Download className="w-3 h-3" /> Export CSV
                </button>
              </>
            )}
            {runStatus === "running" && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#10B98130", borderTopColor: "#10B981" }} />
                <span className="text-[11px] font-sans" style={{ color: "#484A6E" }}>Executing…</span>
              </div>
            )}
            {runStatus === "error" && <span className="text-[11px] font-sans" style={{ color: "#EF4444" }}>Query failed</span>}
          </div>
        )}

        {runStatus === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 relative">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(30,31,50,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(30,31,50,0.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
            <div className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Play className="w-4 h-4" style={{ color: "#10B981" }} />
            </div>
            <div className="relative z-10 text-center">
              <p className="text-sm font-sans font-medium" style={{ color: "#484A6E" }}>Run a MongoDB query</p>
              <p className="text-xs font-sans mt-1" style={{ color: "#3A3B58" }}>Select a collection and press <kbd className="font-mono px-1.5 py-0.5 rounded" style={{ background: "#13141F", border: "1px solid #282940", color: "#8890BB", fontSize: 10 }}>⌘↵</kbd></p>
            </div>
          </div>
        )}

        {runStatus === "running" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#10B98130", borderTopColor: "#10B981" }} />
              </div>
              <span className="text-sm font-sans" style={{ color: "#484A6E" }}>Executing query…</span>
            </div>
          </div>
        )}

        {runStatus === "success" && queryResult && (
          <DataTable columns={queryResult.columns} rows={queryResult.rows} totalRows={queryResult.row_count} queryTime={`${queryResult.execution_time_ms}ms`} connectionName={connection.name} />
        )}

        {runStatus === "error" && (
          <div className="flex-1 p-5 overflow-auto">
            <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold font-sans mb-2" style={{ color: "#EF4444" }}>Query Error</p>
                <pre className="font-mono text-xs whitespace-pre-wrap break-words" style={{ color: "#8890BB" }}>{errorMsg}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
