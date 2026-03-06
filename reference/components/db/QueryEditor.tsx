"use client";
import { useState, useRef, useCallback } from "react";
import {
  Play,
  AlignLeft,
  Clock,
  Save,
  XCircle,
  AlertCircle,
  Database,
} from "lucide-react";
import { DataTable } from "./DataTable";
import { SAMPLE_QUERY, QUERY_RESULTS, QUERY_RESULT_COLUMNS } from "@/lib/mock-data";
import type { Connection } from "@/lib/mock-data";

const SQL_KEYWORDS =
  /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|NULL|NOT|AND|OR|IN|IS|AS|DISTINCT|COUNT|SUM|MAX|MIN|AVG|HAVING|WITH|UNION|ALL|CASE|WHEN|THEN|ELSE|END|RETURNING|CONSTRAINT|DEFAULT)\b/g;

function highlightSQL(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = [];
    // Comments
    const commentIdx = line.indexOf("--");
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const comment = line.slice(commentIdx);
      parts.push(...highlightLine(before, li + "-b"));
      parts.push(
        <span key={`${li}-c`} style={{ color: "var(--text-muted)" }}>
          {comment}
        </span>
      );
    } else {
      parts.push(...highlightLine(line, String(li)));
    }
    return (
      <div key={li} style={{ minHeight: "1.7em", lineHeight: "1.7" }}>
        {parts}
        {"\n"}
      </div>
    );
  });
}

function highlightLine(text: string, key: string | number): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let last = 0;
  const regex = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP\s+BY|ORDER\s+BY|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|NULL|NOT|AND|OR|IN|IS|AS|DISTINCT|COUNT|SUM|MAX|MIN|AVG|HAVING|WITH|UNION|ALL|CASE|WHEN|THEN|ELSE|END|RETURNING|CONSTRAINT|DEFAULT)\b)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      result.push(
        <span key={`${key}-plain-${last}`} style={{ color: "var(--text-secondary)" }}>
          {text.slice(last, match.index)}
        </span>
      );
    }
    const token = match[0];
    const isString = token.startsWith("'") || token.startsWith('"');
    result.push(
      <span
        key={`${key}-token-${match.index}`}
        style={{
          color: isString
            ? "var(--accent-green)"
            : "var(--accent-violet)",
          fontWeight: isString ? undefined : "600",
        }}
      >
        {token}
      </span>
    );
    last = match.index + token.length;
  }
  if (last < text.length) {
    result.push(
      <span key={`${key}-tail`} style={{ color: "var(--text-secondary)" }}>
        {text.slice(last)}
      </span>
    );
  }
  return result;
}

type RunStatus = "idle" | "running" | "success" | "error";

interface QueryEditorProps {
  connection: Connection | undefined;
}

export function QueryEditor({ connection }: QueryEditorProps) {
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [splitRatio, setSplitRatio] = useState(42); // % for editor
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const lineCount = query.split("\n").length;
  const accentColor = connection?.color ?? "#3B82F6";

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

  const runQuery = () => {
    setRunStatus("running");
    setTimeout(() => setRunStatus("success"), 900);
  };

  // Drag to resize
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setSplitRatio(Math.min(75, Math.max(20, pct)));
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp, { once: true });
    document.addEventListener("mouseup", () =>
      document.removeEventListener("mousemove", onMove)
    , { once: true });
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Editor pane */}
      <div
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{ height: `${splitRatio}%` }}
      >
        {/* Editor toolbar */}
        <div
          className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={runQuery}
            disabled={runStatus === "running"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium"
            style={{ background: "var(--accent-green)", color: "white" }}
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Run
            <span
              className="ml-1 font-mono text-[10px] opacity-70"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              ⌘↵
            </span>
          </button>
          {[
            { icon: <AlignLeft className="w-3.5 h-3.5" />, label: "Format SQL" },
            { icon: <Clock className="w-3.5 h-3.5" />,    label: "History"    },
            { icon: <Save className="w-3.5 h-3.5" />,     label: "Save"       },
          ].map(({ icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-sans"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              {icon} {label}
            </button>
          ))}
          <div className="flex-1" />
          {connection && (
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono"
              style={{
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}30`,
                color: accentColor,
              }}
            >
              <Database className="w-3.5 h-3.5" />
              {connection.name}
            </div>
          )}
        </div>

        {/* Editor area with line numbers */}
        <div className="flex flex-1 overflow-hidden" style={{ background: "var(--bg-base)" }}>
          {/* Line numbers */}
          <div
            className="flex-shrink-0 select-none text-right pr-3 pt-4 overflow-hidden"
            style={{
              width: 40,
              background: "var(--bg-surface)",
              borderRight: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: "1.7",
            }}
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code overlay + textarea */}
          <div className="relative flex-1 overflow-auto">
            {/* Highlighted display */}
            <pre
              className="absolute inset-0 pointer-events-none px-4 pt-4 pb-4 overflow-hidden"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: "1.7",
                color: "var(--text-secondary)",
                whiteSpace: "pre",
                margin: 0,
              }}
              aria-hidden="true"
            >
              {highlightSQL(query)}
            </pre>

            {/* Actual textarea (transparent text) */}
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleTab}
              spellCheck={false}
              className="absolute inset-0 w-full h-full resize-none outline-none bg-transparent px-4 pt-4 pb-4"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: "1.7",
                color: "transparent",
                caretColor: "var(--text-primary)",
                whiteSpace: "pre",
                tabSize: 2,
              }}
            />
          </div>
        </div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-center flex-shrink-0 cursor-row-resize"
        style={{
          height: 8,
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="w-16 h-0.5 rounded-full"
          style={{ background: "var(--border-strong)" }}
        />
      </div>

      {/* Results pane */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ background: "var(--bg-surface)" }}
      >
        {runStatus === "idle" && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-3"
            style={{
              background: `radial-gradient(circle at 50% 50%, var(--bg-elevated) 0%, var(--bg-surface) 70%)`,
            }}
          >
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <Play
              className="w-8 h-8 relative z-10"
              style={{ color: "var(--text-muted)" }}
            />
            <p
              className="text-sm font-sans relative z-10"
              style={{ color: "var(--text-muted)" }}
            >
              Write a query and press{" "}
              <kbd
                className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
              >
                ⌘↵
              </kbd>{" "}
              to run
            </p>
          </div>
        )}

        {runStatus === "running" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${accentColor}40`, borderTopColor: accentColor }}
              />
              <span className="text-sm font-sans" style={{ color: "var(--text-muted)" }}>
                Executing query...
              </span>
            </div>
          </div>
        )}

        {runStatus === "success" && (
          <DataTable
            columns={QUERY_RESULT_COLUMNS}
            rows={QUERY_RESULTS}
            totalRows={4}
            queryTime={`42ms · ${connection?.name ?? "local-docker"}`}
          />
        )}

        {runStatus === "error" && (
          <div className="flex-1 p-5">
            <div
              className="flex items-start gap-3 p-4 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--accent-red)" }} />
              <div>
                <p className="text-sm font-semibold font-sans" style={{ color: "var(--accent-red)" }}>
                  ERROR: relation "userrs" does not exist
                </p>
                <p className="font-mono text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  LINE 5: FROM userrs u
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
