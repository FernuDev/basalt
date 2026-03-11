import { useState, useRef, useCallback } from "react";
import {
  Play,
  AlignLeft,
  Clock,
  XCircle,
  Database,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "./DataTable";
import { MongoQueryEditor } from "./MongoQueryEditor";
import { SAMPLE_QUERY } from "../../lib/types";
import { db } from "../../lib/db";
import type { Connection, QueryResult, TableMeta } from "../../lib/types";

// ── Syntax tokens ─────────────────────────────────────────────────────────────
const KW_CLAUSE =
  /\b(SELECT|FROM|WHERE|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|UNION|ALL|EXCEPT|INTERSECT|WITH|AS|DISTINCT|INTO|VALUES|SET|RETURNING|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS|NULL|ANY|SOME|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|DEFAULT|CONSTRAINT|INDEX|UNIQUE|CHECK)\b/gi;

const KW_DDL =
  /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|VIEW|INDEX|SEQUENCE|SCHEMA|DATABASE|TRIGGER|FUNCTION|PROCEDURE|TYPE|EXTENSION|GRANT|REVOKE|TRUNCATE|BEGIN|COMMIT|ROLLBACK|TRANSACTION)\b/gi;

const KW_FN =
  /\b(COUNT|SUM|AVG|MAX|MIN|COALESCE|NULLIF|GREATEST|LEAST|NOW|CURRENT_DATE|CURRENT_TIMESTAMP|DATE_TRUNC|DATE_PART|EXTRACT|TO_CHAR|TO_DATE|TO_TIMESTAMP|LOWER|UPPER|TRIM|LTRIM|RTRIM|LENGTH|SUBSTRING|REPLACE|CONCAT|SPLIT_PART|ARRAY_AGG|STRING_AGG|JSON_AGG|JSONB_AGG|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|FIRST_VALUE|LAST_VALUE|OVER|PARTITION\s+BY|CAST|CONVERT|ROUND|FLOOR|CEIL|ABS|MOD|GENERATE_SERIES)\b/gi;

const KW_BOOL = /\b(TRUE|FALSE|NULL)\b/gi;
const KW_NUM = /\b(\d+(?:\.\d+)?)\b/g;
const KW_STR = /('(?:[^'\\]|\\.)*')/g;

type TokenType = "keyword" | "ddl" | "fn" | "bool" | "number" | "string" | "comment" | "plain";

interface Token {
  text: string;
  type: TokenType;
}

function tokenizeLine(line: string): Token[] {
  const commentIdx = line.indexOf("--");
  const codePart = commentIdx !== -1 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx !== -1 ? line.slice(commentIdx) : null;

  const tokens: Token[] = [];
  const marks: { start: number; end: number; type: TokenType }[] = [];

  const scan = (re: RegExp, type: TokenType) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(codePart)) !== null) {
      marks.push({ start: m.index, end: m.index + m[0].length, type });
    }
  };

  scan(KW_STR, "string");
  const strRanges = marks.filter((m) => m.type === "string");
  const inString = (i: number) =>
    strRanges.some((r) => i >= r.start && i < r.end);

  const addMark = (re: RegExp, type: TokenType) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(codePart)) !== null) {
      if (!inString(m.index))
        marks.push({ start: m.index, end: m.index + m[0].length, type });
    }
  };
  addMark(KW_CLAUSE, "keyword");
  addMark(KW_DDL, "ddl");
  addMark(KW_FN, "fn");
  addMark(KW_BOOL, "bool");
  addMark(KW_NUM, "number");

  marks.sort((a, b) => a.start - b.start || b.end - a.end);

  // Deduplicate (keep longest/first non-overlapping)
  const clean: typeof marks = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start < cursor) continue;
    clean.push(m);
    cursor = m.end;
  }

  let pos = 0;
  for (const m of clean) {
    if (m.start > pos)
      tokens.push({ text: codePart.slice(pos, m.start), type: "plain" });
    tokens.push({ text: codePart.slice(m.start, m.end), type: m.type });
    pos = m.end;
  }
  if (pos < codePart.length)
    tokens.push({ text: codePart.slice(pos), type: "plain" });
  if (commentPart !== null)
    tokens.push({ text: commentPart, type: "comment" });

  return tokens;
}

const TOKEN_COLORS: Record<TokenType, React.CSSProperties> = {
  keyword: { color: "#9D6FE8", fontWeight: 600 },
  ddl:     { color: "#C084FC", fontWeight: 600 },
  fn:      { color: "#4F7EE8" },
  bool:    { color: "#F59E0B" },
  number:  { color: "#F59E0B" },
  string:  { color: "#34D399" },
  comment: { color: "#3A3B58", fontStyle: "italic" },
  plain:   { color: "#8890BB" },
};

/**
 * Render the entire code block as flat inline spans + literal "\n" characters.
 * This keeps the text content identical to the textarea so cursor positions align.
 */
function renderHighlight(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    const tokens = tokenizeLine(line);
    tokens.forEach((t, j) => {
      nodes.push(
        <span key={`${i}-${j}`} style={TOKEN_COLORS[t.type]}>
          {t.text}
        </span>
      );
    });
    // Preserve newline characters so the overlay mirrors the textarea exactly
    if (i < lines.length - 1) nodes.push("\n");
  });
  return nodes;
}

// ── Format SQL (basic) ────────────────────────────────────────────────────────
const FORMAT_KEYWORDS =
  /\b(SELECT|FROM|WHERE|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+JOIN|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|UNION|ALL|AND|OR|SET|RETURNING)\b/gi;

function formatSQL(sql: string): string {
  return sql
    .replace(/\s+/g, " ")
    .trim()
    .replace(FORMAT_KEYWORDS, (m) => "\n" + m.toUpperCase())
    .replace(/,\s*/g, ",\n  ")
    .replace(/^\n/, "")
    .split("\n")
    .map((l) => l.trim())
    .join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────
type RunStatus = "idle" | "running" | "success" | "error";

interface QueryEditorProps {
  connection: Connection | null;
  tables?: TableMeta[];
}

export function QueryEditor({ connection, tables = [] }: QueryEditorProps) {
  // Delegate to MongoDB editor when appropriate
  if (connection?.type === "mongodb") {
    return <MongoQueryEditor connection={connection} tables={tables} />;
  }


  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [splitRatio, setSplitRatio] = useState(42);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [activeLine, setActiveLine] = useState(1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);
  const isDragging = useRef(false);

  const lines = query.split("\n");
  const lineCount = lines.length;
  const accentColor = connection?.color ?? "#7C4FD4";

  // Sync cursor pos
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

  // Sync scroll: overflow:hidden elements still accept scrollTop/scrollLeft
  const syncScroll = () => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    const ln = lineNumRef.current;
    if (!ta) return;
    if (ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
    if (ln) ln.scrollTop = ta.scrollTop;
  };

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = query.slice(0, start) + "  " + query.slice(end);
      setQuery(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  const runQuery = useCallback(async () => {
    if (!connection) {
      toast.error("No connection selected");
      return;
    }
    if (!query.trim()) return;
    setRunStatus("running");
    setErrorMsg("");
    try {
      const result = await db.executeQuery(connection.id, query);
      setQueryResult(result);
      setRunStatus("success");
    } catch (err) {
      setErrorMsg(String(err));
      setRunStatus("error");
    }
  }, [connection, query]);

  const handleFormat = () => {
    setQuery(formatSQL(query));
  };

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
    document.addEventListener(
      "mouseup",
      () => document.removeEventListener("mousemove", onMove),
      { once: true }
    );
  }, []);


  const lineHeight = 1.75 * 13; // px (lineHeight × fontSize)

  return (
    <div ref={containerRef} className="flex flex-col h-full" style={{ background: "#0A0B13" }}>

      {/* ── Editor pane ── */}
      <div
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{ height: `${splitRatio}%` }}
      >
        {/* Toolbar */}
        <div
          className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
          style={{
            background: "#0E0F1A",
            borderBottom: "1px solid #1E1F32",
          }}
        >
          {/* Run */}
          <button
            onClick={runQuery}
            disabled={runStatus === "running" || !connection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-semibold cursor-pointer disabled:opacity-40 transition-all"
            style={{
              background: "linear-gradient(135deg, #7C4FD4, #9D6FE8)",
              color: "white",
              boxShadow: runStatus === "running" ? "none" : "0 0 12px rgba(124,79,212,0.35)",
            }}
          >
            {runStatus === "running" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white" />
            )}
            Run
            <kbd
              className="ml-1 font-mono text-[10px] opacity-80 px-1 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              ⌘↵
            </kbd>
          </button>

          <div className="w-px h-5 mx-0.5" style={{ background: "#1E1F32" }} />

          {/* Format */}
          <button
            onClick={handleFormat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-sans cursor-pointer transition-colors"
            style={{
              color: "#8890BB",
              border: "1px solid #1E1F32",
              background: "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#13141F"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Format
          </button>

          {/* History (placeholder) */}
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-sans cursor-pointer transition-colors"
            style={{
              color: "#484A6E",
              border: "1px solid #1E1F32",
              background: "transparent",
            }}
            title="Query history (coming soon)"
          >
            <Clock className="w-3.5 h-3.5" />
            History
          </button>

          <div className="flex-1" />

          {/* Connection badge */}
          {connection ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono"
              style={{
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}35`,
                color: accentColor,
              }}
            >
              <Database className="w-3 h-3" />
              {connection.name}
            </div>
          ) : (
            <span className="text-xs font-sans" style={{ color: "#484A6E" }}>
              No connection
            </span>
          )}
        </div>

        {/* Code area */}
        <div
          className="flex flex-1 overflow-hidden relative"
          style={{ background: "#0A0B13" }}
        >
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
                  background:
                    i + 1 === activeLine ? "rgba(124,79,212,0.06)" : "transparent",
                  paddingRight: 10,
                  lineHeight: `${lineHeight}px`,
                  height: lineHeight,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Overlay + textarea */}
          <div className="relative flex-1 overflow-hidden">
            {/* Active line glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 14 + (activeLine - 1) * lineHeight,
                left: 0,
                right: 0,
                height: lineHeight,
                background: "rgba(124,79,212,0.055)",
                borderLeft: "2px solid rgba(124,79,212,0.35)",
              }}
            />

            {/* Syntax overlay */}
            <            pre
              ref={overlayRef}
              className="absolute inset-0 pointer-events-none"
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 13,
                lineHeight: `${lineHeight}px`,
                padding: "14px 16px",
                margin: 0,
                whiteSpace: "pre",
                color: "#8890BB",
                overflow: "hidden",
                // word-spacing must match textarea exactly
                wordSpacing: "normal",
                letterSpacing: "normal",
              }}
              aria-hidden="true"
            >
              {renderHighlight(query)}
            </pre>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); updateCursor(); }}
              onKeyDown={handleTab}
              onKeyUp={updateCursor}
              onClick={updateCursor}
              onScroll={syncScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="absolute inset-0 w-full h-full resize-none outline-none bg-transparent"
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 13,
                lineHeight: `${lineHeight}px`,
                padding: "14px 16px",
                color: "transparent",
                caretColor: "#C084FC",
                whiteSpace: "pre",
                tabSize: 2,
                overflowY: "auto",
                overflowX: "auto",
                // Must match <pre> exactly so cursor aligns with highlighted text
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
          style={{
            height: 24,
            background: "#0E0F1A",
            borderTop: "1px solid #1E1F32",
          }}
        >
          <span
            className="font-mono text-[10px]"
            style={{ color: "#3A3B58" }}
          >
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span className="font-mono text-[10px]" style={{ color: "#3A3B58" }}>
            {query.length} chars
          </span>
          <span className="font-mono text-[10px]" style={{ color: "#3A3B58" }}>
            {lineCount} lines
          </span>
          <span className="font-mono text-[10px] ml-auto" style={{ color: "#3A3B58" }}>
            PostgreSQL
          </span>
        </div>
      </div>

      {/* ── Drag handle ── */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-center flex-shrink-0 cursor-row-resize group"
        style={{
          height: 6,
          background: "#0E0F1A",
          borderTop: "1px solid #1E1F32",
          borderBottom: "1px solid #1E1F32",
        }}
      >
        <div
          className="w-12 h-0.5 rounded-full transition-all group-hover:w-20"
          style={{ background: "#282940" }}
        />
      </div>

      {/* ── Results pane ── */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#0E0F1A" }}>

        {/* Results header */}
        {(runStatus === "success" || runStatus === "error" || runStatus === "running") && (
          <div
            className="flex items-center gap-3 px-4 flex-shrink-0"
            style={{
              height: 34,
              borderBottom: "1px solid #1E1F32",
              background: "#0A0B13",
            }}
          >
            <span
              className="text-[10px] font-semibold font-sans tracking-widest uppercase"
              style={{ color: "#484A6E" }}
            >
              Results
            </span>

            {runStatus === "success" && queryResult && (
              <>
                <span
                  className="font-mono text-[11px] px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    color: "#34D399",
                    border: "1px solid rgba(52,211,153,0.2)",
                  }}
                >
                  {queryResult.row_count.toLocaleString()} rows
                </span>
                <span
                  className="font-mono text-[11px] px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(79,126,232,0.1)",
                    color: "#4F7EE8",
                    border: "1px solid rgba(79,126,232,0.2)",
                  }}
                >
                  {queryResult.execution_time_ms}ms
                </span>
              </>
            )}

            {runStatus === "running" && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: `${accentColor}40`,
                    borderTopColor: accentColor,
                  }}
                />
                <span className="text-[11px] font-sans" style={{ color: "#484A6E" }}>
                  Executing…
                </span>
              </div>
            )}

            {runStatus === "error" && (
              <span className="text-[11px] font-sans" style={{ color: "#EF4444" }}>
                Query failed
              </span>
            )}
          </div>
        )}

        {/* Results body */}
        {runStatus === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 relative">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(30,31,50,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(30,31,50,0.6) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div
              className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(124,79,212,0.1)",
                border: "1px solid rgba(124,79,212,0.2)",
              }}
            >
              <Play className="w-4 h-4" style={{ color: "#7C4FD4" }} />
            </div>
            <div className="relative z-10 text-center">
              <p className="text-sm font-sans font-medium" style={{ color: "#484A6E" }}>
                Run a query to see results
              </p>
              <p className="text-xs font-sans mt-1" style={{ color: "#3A3B58" }}>
                Press{" "}
                <kbd
                  className="font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: "#13141F",
                    border: "1px solid #282940",
                    color: "#8890BB",
                    fontSize: 10,
                  }}
                >
                  ⌘↵
                </kbd>{" "}
                or click Run
              </p>
            </div>
          </div>
        )}

        {runStatus === "running" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-8 h-8">
                <div
                  className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
                  style={{
                    borderColor: `${accentColor}30`,
                    borderTopColor: accentColor,
                  }}
                />
              </div>
              <span className="text-sm font-sans" style={{ color: "#484A6E" }}>
                Executing query…
              </span>
            </div>
          </div>
        )}

        {runStatus === "success" && queryResult && (
          <DataTable
            columns={queryResult.columns}
            rows={queryResult.rows}
            totalRows={queryResult.row_count}
            queryTime={`${queryResult.execution_time_ms}ms`}
            connectionName={connection?.name}
            tableName={`query_${connection?.name ?? "result"}`}
          />
        )}

        {runStatus === "error" && (
          <div className="flex-1 p-5 overflow-auto">
            <div
              className="flex items-start gap-3 p-4 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <XCircle
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: "#EF4444" }}
              />
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold font-sans mb-2"
                  style={{ color: "#EF4444" }}
                >
                  Query Error
                </p>
                <pre
                  className="font-mono text-xs whitespace-pre-wrap break-words"
                  style={{ color: "#8890BB" }}
                >
                  {errorMsg}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
