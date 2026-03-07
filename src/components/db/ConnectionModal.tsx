import { useState, useEffect } from "react";
import {
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Upload,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { COLOR_PRESETS } from "../../lib/types";
import { db, mongo } from "../../lib/db";
import type { Connection, ConnectionType } from "../../lib/types";

interface ConnectionModalProps {
  open: boolean;
  editingConnection?: Connection | null;
  onClose: () => void;
  onSave: (conn: Partial<Connection>) => void;
}

type DbTab = "postgres" | "mongodb";
type PgTab = "quick" | "pg-advanced";
type MgTab = "mg-quick" | "mg-advanced";
type TestStatus = "idle" | "loading" | "success" | "error";

// ── Shared sub-components ─────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-sans font-medium" style={{ color: "#484A6E" }}>
      {children}
    </label>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
function ModalInput({
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
        "w-full px-3 py-2 text-sm font-mono rounded-md outline-none transition-colors",
        readOnly && "opacity-60 cursor-default",
        className
      )}
      style={{ background: "#0A0B13", border: "1px solid #282940", color: "#E8EAFF" }}
      onFocus={(e) => { if (!readOnly) e.currentTarget.style.borderColor = "#7C4FD4"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#282940"; }}
    />
  );
}
function NativeSelect({
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
        style={{ background: "#0A0B13", border: "1px solid #282940", color: "#8890BB" }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown
        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "#484A6E" }}
      />
    </div>
  );
}

// ── Test result banner ────────────────────────────────────────────────────────
function TestBanner({ status, msg }: { status: TestStatus; msg: string }) {
  if (status === "idle") return null;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-sans"
      style={{
        background:
          status === "success" ? "rgba(16,185,129,0.1)"
          : status === "error"   ? "rgba(239,68,68,0.1)"
          : "#13141F",
        border: `1px solid ${
          status === "success" ? "rgba(16,185,129,0.3)"
          : status === "error"   ? "rgba(239,68,68,0.3)"
          : "#1E1F32"
        }`,
        color:
          status === "success" ? "#10B981"
          : status === "error"   ? "#EF4444"
          : "#8890BB",
      }}
    >
      {status === "loading"  && <Loader2 className="w-4 h-4 animate-spin" />}
      {status === "success"  && <CheckCircle2 className="w-4 h-4" />}
      {status === "error"    && <XCircle className="w-4 h-4" />}
      <span className="truncate">
        {status === "loading" ? "Connecting…" : msg}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ConnectionModal({ open, editingConnection, onClose, onSave }: ConnectionModalProps) {
  const isEditing = !!editingConnection;

  // DB type selector
  const [dbTab, setDbTab] = useState<DbTab>("postgres");

  // PostgreSQL state
  const [pgTab, setPgTab] = useState<PgTab>("quick");
  const [pgUri, setPgUri] = useState("");
  const [pgHost, setPgHost] = useState("localhost");
  const [pgPort, setPgPort] = useState("5432");
  const [pgDb, setPgDb] = useState("");
  const [pgUser, setPgUser] = useState("postgres");
  const [pgPass, setPgPass] = useState("");
  const [pgSchema, setPgSchema] = useState("public");
  const [pgSSL, setPgSSL] = useState("disable");
  const [showPgPass, setShowPgPass] = useState(false);

  // MongoDB state
  const [mgTab, setMgTab] = useState<MgTab>("mg-quick");
  const [mgUri, setMgUri] = useState("mongodb://");
  const [mgHost, setMgHost] = useState("localhost");
  const [mgPort, setMgPort] = useState("27017");
  const [mgDb, setMgDb] = useState("");
  const [mgUser, setMgUser] = useState("");
  const [mgPass, setMgPass] = useState("");
  const [mgAuthSource, setMgAuthSource] = useState("admin");
  const [mgTls, setMgTls] = useState(false);
  const [showMgPass, setShowMgPass] = useState(false);

  // Shared
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");

  const buildPgUri = () =>
    `postgres://${pgUser}:${pgPass}@${pgHost}:${pgPort}/${pgDb}`;

  const buildMgUri = () => {
    const auth = mgUser ? `${encodeURIComponent(mgUser)}:${encodeURIComponent(mgPass)}@` : "";
    const tls = mgTls ? "?tls=true" : "";
    const authSrc = mgAuthSource && mgUser ? `${tls ? "&" : "?"}authSource=${mgAuthSource}` : "";
    return `mongodb://${auth}${mgHost}:${mgPort}/${mgDb}${tls}${authSrc}`;
  };

  const getEffectiveUri = (): { uri: string; type: ConnectionType } => {
    if (dbTab === "mongodb") {
      return {
        uri: mgTab === "mg-quick" ? mgUri : buildMgUri(),
        type: "mongodb",
      };
    }
    return {
      uri: pgTab === "quick" ? pgUri : buildPgUri(),
      type: "postgres",
    };
  };

  // Reset on open / editingConnection change
  useEffect(() => {
    if (editingConnection) {
      setDbTab(editingConnection.type === "mongodb" ? "mongodb" : "postgres");
      if (editingConnection.type === "mongodb") {
        setMgUri(editingConnection.uri);
      } else {
        setPgUri(editingConnection.uri);
      }
      setDisplayName(editingConnection.name);
      setColor(editingConnection.color);
    } else {
      setDbTab("postgres");
      setPgUri(""); setPgHost("localhost"); setPgPort("5432");
      setPgDb(""); setPgUser("postgres"); setPgPass("");
      setMgUri("mongodb://"); setMgHost("localhost"); setMgPort("27017");
      setMgDb(""); setMgUser(""); setMgPass(""); setMgAuthSource("admin"); setMgTls(false);
      setDisplayName(""); setColor(COLOR_PRESETS[0]);
    }
    setTestStatus("idle"); setTestMsg(""); setPgTab("quick"); setMgTab("mg-quick");
  }, [editingConnection, open]);

  const runTest = async () => {
    const { uri, type } = getEffectiveUri();
    if (!uri || uri === "mongodb://") {
      setTestStatus("error"); setTestMsg("Please enter a connection URI."); return;
    }
    setTestStatus("loading"); setTestMsg("");
    const testId = `__test_${Date.now()}`;
    try {
      let version: string;
      if (type === "mongodb") {
        version = await mongo.connect(testId, uri);
        await mongo.disconnect(testId);
      } else {
        version = await db.connect(testId, uri);
        await db.disconnect(testId);
      }
      setTestStatus("success"); setTestMsg(`Connected — ${version}`);
    } catch (err) {
      setTestStatus("error"); setTestMsg(String(err));
    }
  };

  const handleSave = () => {
    const { uri, type } = getEffectiveUri();
    const name =
      displayName ||
      (dbTab === "mongodb"
        ? (mgDb || mgHost || "mongo-connection")
        : (pgTab === "quick"
            ? (uri.split("@")[1]?.split("/")[1] ?? "New connection")
            : (pgDb || "New connection")));
    onSave({ name, color, uri, type });
  };

  if (!open) return null;

  // ── DB type selector tabs ──
  const DB_TABS: { id: DbTab; label: string; badge: string; badgeColor: string }[] = [
    { id: "postgres", label: "PostgreSQL", badge: "PG", badgeColor: "#4F7EE8" },
    { id: "mongodb",  label: "MongoDB",   badge: "MG", badgeColor: "#10B981" },
  ];

  const PG_TABS: { id: PgTab; label: string }[] = [
    { id: "quick",       label: "Quick (URI)" },
    { id: "pg-advanced", label: "Advanced"    },
  ];
  const MG_TABS: { id: MgTab; label: string }[] = [
    { id: "mg-quick",    label: "Quick (URI)" },
    { id: "mg-advanced", label: "Advanced"    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: "#191A2A",
          border: "1px solid #282940",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1E1F32" }}
        >
          <div>
            <h2 className="text-sm font-semibold font-sans" style={{ color: "#E8EAFF" }}>
              {isEditing ? "Edit Connection" : "New Connection"}
            </h2>
            {isEditing && editingConnection && (
              <p className="text-xs font-sans mt-0.5" style={{ color: "#484A6E" }}>
                {editingConnection.version}
                {editingConnection.lastConnected && ` · ${editingConnection.lastConnected}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-basalt-elevated transition-colors cursor-pointer"
            style={{ color: "#484A6E" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DB type selector */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderBottom: "1px solid #1E1F32", background: "#13141F" }}
        >
          {DB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setDbTab(t.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans font-medium cursor-pointer transition-all"
              style={{
                background: dbTab === t.id ? "#191A2A" : "transparent",
                border: dbTab === t.id ? `1px solid ${t.badgeColor}40` : "1px solid transparent",
                color: dbTab === t.id ? "#E8EAFF" : "#484A6E",
              }}
            >
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: `${t.badgeColor}20`,
                  color: t.badgeColor,
                }}
              >
                {t.badge}
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div
          className="flex items-center px-5 gap-1"
          style={{ borderBottom: "1px solid #1E1F32" }}
        >
          {dbTab === "postgres"
            ? PG_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPgTab(t.id)}
                  className="px-3 py-2.5 text-xs font-sans transition-colors cursor-pointer"
                  style={{
                    color: pgTab === t.id ? "#E8EAFF" : "#484A6E",
                    borderBottom: pgTab === t.id ? "2px solid #7C4FD4" : "2px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))
            : MG_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMgTab(t.id)}
                  className="px-3 py-2.5 text-xs font-sans transition-colors cursor-pointer"
                  style={{
                    color: mgTab === t.id ? "#E8EAFF" : "#484A6E",
                    borderBottom: mgTab === t.id ? "2px solid #10B981" : "2px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">

          {/* ── PostgreSQL forms ── */}
          {dbTab === "postgres" && pgTab === "quick" && (
            <Field label="Connection URI">
              <ModalInput value={pgUri} onChange={setPgUri} placeholder="postgres://user:pass@host:5432/dbname" />
            </Field>
          )}

          {dbTab === "postgres" && pgTab === "pg-advanced" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Host"><ModalInput value={pgHost} onChange={setPgHost} placeholder="localhost" /></Field>
                </div>
                <Field label="Port"><ModalInput value={pgPort} onChange={setPgPort} placeholder="5432" /></Field>
              </div>
              <Field label="Database"><ModalInput value={pgDb} onChange={setPgDb} placeholder="my_database" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username"><ModalInput value={pgUser} onChange={setPgUser} placeholder="postgres" /></Field>
                <Field label="Password">
                  <div className="relative">
                    <ModalInput value={pgPass} onChange={setPgPass} type={showPgPass ? "text" : "password"} placeholder="••••••••" />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer" style={{ color: "#484A6E" }} onClick={() => setShowPgPass((v) => !v)}>
                      {showPgPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
              <Field label="Schema (optional)"><ModalInput value={pgSchema} onChange={setPgSchema} placeholder="public" /></Field>
              <Field label="SSL Mode"><NativeSelect value={pgSSL} onChange={setPgSSL} options={["disable", "require", "verify-ca", "verify-full"]} /></Field>
              <Field label="SSL Certificate (optional)">
                <div className="border-2 border-dashed rounded-md py-6 flex flex-col items-center gap-2 cursor-pointer" style={{ borderColor: "#282940", color: "#484A6E" }}>
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-sans">Drop .pem / .crt here or Browse</span>
                </div>
              </Field>
            </>
          )}

          {/* ── MongoDB forms ── */}
          {dbTab === "mongodb" && mgTab === "mg-quick" && (
            <Field label="Connection URI">
              <ModalInput value={mgUri} onChange={setMgUri} placeholder="mongodb://user:pass@host:27017/dbname" />
              <p className="text-[11px] font-sans mt-1" style={{ color: "#484A6E" }}>
                Also supports <span style={{ color: "#10B981" }}>mongodb+srv://</span> for Atlas connections
              </p>
            </Field>
          )}

          {dbTab === "mongodb" && mgTab === "mg-advanced" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Host"><ModalInput value={mgHost} onChange={setMgHost} placeholder="localhost" /></Field>
                </div>
                <Field label="Port"><ModalInput value={mgPort} onChange={setMgPort} placeholder="27017" /></Field>
              </div>
              <Field label="Database (optional)"><ModalInput value={mgDb} onChange={setMgDb} placeholder="my_database" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username"><ModalInput value={mgUser} onChange={setMgUser} placeholder="admin" /></Field>
                <Field label="Password">
                  <div className="relative">
                    <ModalInput value={mgPass} onChange={setMgPass} type={showMgPass ? "text" : "password"} placeholder="••••••••" />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer" style={{ color: "#484A6E" }} onClick={() => setShowMgPass((v) => !v)}>
                      {showMgPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>
              <Field label="Auth Source"><ModalInput value={mgAuthSource} onChange={setMgAuthSource} placeholder="admin" /></Field>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMgTls((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-sans cursor-pointer transition-colors"
                  style={{
                    background: mgTls ? "rgba(16,185,129,0.1)" : "#13141F",
                    border: mgTls ? "1px solid rgba(16,185,129,0.3)" : "1px solid #282940",
                    color: mgTls ? "#10B981" : "#484A6E",
                  }}
                >
                  <div
                    className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: mgTls ? "#10B981" : "#282940" }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                      style={{ left: mgTls ? "17px" : "2px" }}
                    />
                  </div>
                  TLS / SSL
                </button>
              </div>
            </>
          )}

          {/* ── Shared: display name + color ── */}
          <div className="h-px" style={{ background: "#1E1F32" }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Display name">
              <ModalInput value={displayName} onChange={setDisplayName} placeholder={dbTab === "mongodb" ? "atlas-prod" : "local-docker"} />
            </Field>
            <div className="flex flex-col gap-1">
              <FieldLabel>Color</FieldLabel>
              <div className="flex items-center gap-2 py-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full transition-transform duration-150 cursor-pointer"
                    style={{
                      background: c,
                      transform: color === c ? "scale(1.25)" : "scale(1)",
                      boxShadow: color === c ? `0 0 0 2px #191A2A, 0 0 0 3px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <TestBanner status={testStatus} msg={testMsg} />

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={runTest}
              disabled={testStatus === "loading"}
              className="px-4 py-2 text-sm font-sans rounded-md transition-colors cursor-pointer disabled:opacity-50"
              style={{ background: "#13141F", color: "#8890BB", border: "1px solid #282940" }}
            >
              {testStatus === "loading" ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Testing…</span>
              ) : "Test Connection"}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-sans rounded-md cursor-pointer" style={{ color: "#484A6E" }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-sans rounded-md font-medium cursor-pointer"
                style={{ background: "#7C4FD4", color: "white" }}
              >
                {isEditing ? "Save changes" : "Connect →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
