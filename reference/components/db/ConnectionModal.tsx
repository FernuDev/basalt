"use client";
import { useState, useEffect } from "react";
import {
  X,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_PRESETS, type Connection } from "@/lib/mock-data";

interface ConnectionModalProps {
  open: boolean;
  editingConnection?: Connection | null;
  onClose: () => void;
  onSave: (conn: Partial<Connection>) => void;
}

type TabMode = "quick" | "pg-advanced" | "mongo-advanced";
type TestStatus = "idle" | "loading" | "success" | "error";

function detectType(uri: string): "postgres" | "mongo" | null {
  if (uri.startsWith("postgres://") || uri.startsWith("postgresql://")) return "postgres";
  if (uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://")) return "mongo";
  return null;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-sans font-medium" style={{ color: "var(--text-muted)" }}>
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={cn(
        "w-full px-3 py-2 text-sm font-mono rounded-md outline-none",
        "transition-all duration-150",
        readOnly && "opacity-60 cursor-default",
        className
      )}
      style={{
        background: "var(--bg-base)",
        border: "1px solid var(--border-default)",
        color: "var(--text-primary)",
      }}
      onFocus={(e) => {
        if (!readOnly) e.currentTarget.style.borderColor = "var(--accent-blue)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border-default)";
      }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm font-sans rounded-md outline-none appearance-none pr-8"
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border-default)",
          color: "var(--text-secondary)",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--text-muted)" }}
      />
    </div>
  );
}

export function ConnectionModal({
  open,
  editingConnection,
  onClose,
  onSave,
}: ConnectionModalProps) {
  const isEditing = !!editingConnection;

  const [tab, setTab] = useState<TabMode>("quick");
  const [uri, setUri] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // PG fields
  const [pgHost, setPgHost] = useState("localhost");
  const [pgPort, setPgPort] = useState("5432");
  const [pgDb, setPgDb] = useState("");
  const [pgUser, setPgUser] = useState("postgres");
  const [pgPass, setPgPass] = useState("");
  const [pgSchema, setPgSchema] = useState("public");
  const [pgSSL, setPgSSL] = useState("disable");

  // Mongo fields
  const [mHost, setMHost] = useState("");
  const [mDb, setMDb] = useState("");
  const [mUser, setMUser] = useState("");
  const [mPass, setMPass] = useState("");
  const [mAuthMech, setMAuthMech] = useState("SCRAM-SHA-256");
  const [mAppName, setMAppName] = useState("");
  const [mAdvOpen, setMAdvOpen] = useState(false);

  const detectedType = detectType(uri);

  const generatedMongoUri = mHost
    ? `mongodb+srv://${mUser}:${"●".repeat(Math.max(mPass.length, 6))}@${mHost}/${mDb}?authMechanism=${mAuthMech}&retryWrites=true&w=majority`
    : "";

  useEffect(() => {
    if (editingConnection) {
      setUri(editingConnection.uri.replace(/:([^:@]+)@/, ":●●●●●●●●@"));
      setDisplayName(editingConnection.name);
      setColor(editingConnection.color);
    } else {
      setUri("");
      setDisplayName("");
      setColor(COLOR_PRESETS[0]);
    }
    setTestStatus("idle");
    setTestMsg("");
    setTab("quick");
  }, [editingConnection, open]);

  const runTest = () => {
    setTestStatus("loading");
    setTestMsg("");
    setTimeout(() => {
      if (uri || (pgHost && pgDb)) {
        setTestStatus("success");
        setTestMsg(`Connected — ${detectedType === "mongo" ? "MongoDB 7.0.5" : "PostgreSQL 16.2"}`);
      } else {
        setTestStatus("error");
        setTestMsg("Connection refused: no host specified");
      }
    }, 1400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMongoUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) return null;

  const TABS: { id: TabMode; label: string }[] = [
    { id: "quick", label: "Quick (URI)" },
    { id: "pg-advanced", label: "PostgreSQL" },
    { id: "mongo-advanced", label: "MongoDB" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--bg-overlay)",
          border: "1px solid var(--border-default)",
          backdropFilter: "blur(16px)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <h2 className="text-sm font-semibold font-sans" style={{ color: "var(--text-primary)" }}>
              {isEditing ? "Edit Connection" : "New Connection"}
            </h2>
            {isEditing && editingConnection && (
              <p className="text-xs font-sans mt-0.5" style={{ color: "var(--text-muted)" }}>
                Last connected: {editingConnection.lastConnected}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex items-center px-5 gap-1"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2.5 text-xs font-sans transition-colors"
              style={{
                color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: tab === t.id ? "2px solid var(--accent-blue)" : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* ── Quick tab ── */}
          {tab === "quick" && (
            <>
              <Field label="Connection URI">
                <div className="relative">
                  <Input
                    value={uri}
                    onChange={setUri}
                    placeholder="postgres://user:pass@host:5432/dbname"
                  />
                  {isEditing && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: "var(--text-muted)" }}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {detectedType && (
                  <span className="text-xs font-sans mt-1" style={{ color: "var(--accent-green)" }}>
                    <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />
                    Auto-detected: {detectedType === "postgres" ? "PostgreSQL" : "MongoDB"}
                  </span>
                )}
              </Field>
            </>
          )}

          {/* ── PG Advanced tab ── */}
          {tab === "pg-advanced" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Host">
                    <Input value={pgHost} onChange={setPgHost} placeholder="localhost" />
                  </Field>
                </div>
                <Field label="Port">
                  <Input value={pgPort} onChange={setPgPort} placeholder="5432" />
                </Field>
              </div>
              <Field label="Database">
                <Input value={pgDb} onChange={setPgDb} placeholder="my_database" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <Input value={pgUser} onChange={setPgUser} placeholder="postgres" />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Input
                      value={pgPass}
                      onChange={setPgPass}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                    />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: "var(--text-muted)" }}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
              <Field label="Schema (optional)">
                <Input value={pgSchema} onChange={setPgSchema} placeholder="public" />
              </Field>
              <Field label="SSL Mode">
                <Select
                  value={pgSSL}
                  onChange={setPgSSL}
                  options={["disable", "require", "verify-ca", "verify-full"]}
                />
              </Field>
              <Field label="SSL Certificate (optional)">
                <div
                  className="border-2 border-dashed rounded-md py-6 flex flex-col items-center gap-2 cursor-pointer"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-sans">Drop .pem / .crt here or Browse</span>
                </div>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Min connections">
                  <Input value="2" placeholder="2" />
                </Field>
                <Field label="Max connections">
                  <Input value="10" placeholder="10" />
                </Field>
                <Field label="Timeout">
                  <Input value="30s" placeholder="30s" />
                </Field>
              </div>
            </>
          )}

          {/* ── Mongo Advanced tab ── */}
          {tab === "mongo-advanced" && (
            <>
              <Field label="Cluster hostname">
                <Input
                  value={mHost}
                  onChange={setMHost}
                  placeholder="cluster0.abc12.mongodb.net"
                />
              </Field>
              <Field label="Database">
                <Input value={mDb} onChange={setMDb} placeholder="myDatabase" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <Input value={mUser} onChange={setMUser} placeholder="user" />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Input
                      value={mPass}
                      onChange={setMPass}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                    />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: "var(--text-muted)" }}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Auth mechanism">
                  <Select
                    value={mAuthMech}
                    onChange={setMAuthMech}
                    options={["SCRAM-SHA-256", "SCRAM-SHA-1", "MONGODB-AWS"]}
                  />
                </Field>
                <Field label="Auth source">
                  <Input value="admin" placeholder="admin" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked id="tls" className="accent-blue-500" />
                  <label htmlFor="tls" className="text-xs font-sans" style={{ color: "var(--text-secondary)" }}>
                    TLS enabled
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked id="retry" className="accent-blue-500" />
                  <label htmlFor="retry" className="text-xs font-sans" style={{ color: "var(--text-secondary)" }}>
                    retryWrites
                  </label>
                </div>
              </div>
              <Field label="App name (optional)">
                <Input value={mAppName} onChange={setMAppName} placeholder="my-app" />
              </Field>

              {/* Collapsible advanced options */}
              <div>
                <button
                  className="flex items-center gap-1.5 text-xs font-sans"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => setMAdvOpen((v) => !v)}
                >
                  {mAdvOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 -rotate-90" />}
                  Advanced options
                </button>
                {mAdvOpen && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="connectTimeoutMS">
                      <Input value="10000" placeholder="10000" />
                    </Field>
                    <Field label="socketTimeoutMS">
                      <Input value="0" placeholder="0" />
                    </Field>
                    <Field label="maxPoolSize">
                      <Input value="100" placeholder="100" />
                    </Field>
                    <Field label="serverSelectionTimeoutMS">
                      <Input value="30000" placeholder="30000" />
                    </Field>
                  </div>
                )}
              </div>

              {/* Generated URI */}
              {generatedMongoUri && (
                <Field label="Generated URI (read-only)">
                  <div className="relative">
                    <Input value={generatedMongoUri} readOnly />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: copied ? "var(--accent-green)" : "var(--text-muted)" }}
                      onClick={handleCopy}
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              )}
            </>
          )}

          {/* Shared: name + color picker */}
          <div className="h-px" style={{ background: "var(--border-subtle)" }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Display name">
              <Input
                value={displayName}
                onChange={setDisplayName}
                placeholder="local-docker"
              />
            </Field>
            <div className="flex flex-col gap-1">
              <Label>Color</Label>
              <div className="flex items-center gap-2 py-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full transition-transform duration-150"
                    style={{
                      background: c,
                      transform: color === c ? "scale(1.25)" : "scale(1)",
                      boxShadow: color === c ? `0 0 0 2px var(--bg-overlay), 0 0 0 3px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Test connection result */}
          {testStatus !== "idle" && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-sans"
              style={{
                background:
                  testStatus === "success"
                    ? "rgba(16,185,129,0.1)"
                    : testStatus === "error"
                    ? "rgba(239,68,68,0.1)"
                    : "var(--bg-elevated)",
                border: `1px solid ${
                  testStatus === "success"
                    ? "rgba(16,185,129,0.3)"
                    : testStatus === "error"
                    ? "rgba(239,68,68,0.3)"
                    : "var(--border-subtle)"
                }`,
                color:
                  testStatus === "success"
                    ? "var(--accent-green)"
                    : testStatus === "error"
                    ? "var(--accent-red)"
                    : "var(--text-secondary)",
              }}
            >
              {testStatus === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
              {testStatus === "success" && <CheckCircle2 className="w-4 h-4" />}
              {testStatus === "error" && <XCircle className="w-4 h-4" />}
              {testStatus === "loading" ? "Connecting..." : testMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={runTest}
              disabled={testStatus === "loading"}
              className="px-4 py-2 text-sm font-sans rounded-md transition-colors"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              {testStatus === "loading" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Testing...
                </span>
              ) : (
                "Test Connection"
              )}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-sans rounded-md transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  onSave({
                    name: displayName,
                    color,
                    uri: tab === "quick" ? uri : undefined,
                    type: detectedType || "postgres",
                  })
                }
                className="px-4 py-2 text-sm font-sans rounded-md font-medium transition-colors"
                style={{ background: "var(--accent-blue)", color: "white" }}
              >
                {isEditing ? "Save changes" : "Connect \u2192"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
