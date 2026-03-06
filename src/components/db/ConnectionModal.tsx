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
import { db } from "../../lib/db";
import type { Connection } from "../../lib/types";

interface ConnectionModalProps {
  open: boolean;
  editingConnection?: Connection | null;
  onClose: () => void;
  onSave: (conn: Partial<Connection>) => void;
}

type TabMode = "quick" | "pg-advanced";
type TestStatus = "idle" | "loading" | "success" | "error";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="text-xs font-sans font-medium"
      style={{ color: "#484A6E" }}
    >
      {children}
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
      style={{
        background: "#0A0B13",
        border: "1px solid #282940",
        color: "#E8EAFF",
      }}
      onFocus={(e) => {
        if (!readOnly) e.currentTarget.style.borderColor = "#7C4FD4";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#282940";
      }}
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
        style={{
          background: "#0A0B13",
          border: "1px solid #282940",
          color: "#8890BB",
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
        style={{ color: "#484A6E" }}
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

  // PG Advanced fields
  const [pgHost, setPgHost] = useState("localhost");
  const [pgPort, setPgPort] = useState("5432");
  const [pgDb, setPgDb] = useState("");
  const [pgUser, setPgUser] = useState("postgres");
  const [pgPass, setPgPass] = useState("");
  const [pgSchema, setPgSchema] = useState("public");
  const [pgSSL, setPgSSL] = useState("disable");

  const buildPgUri = () =>
    `postgres://${pgUser}:${pgPass}@${pgHost}:${pgPort}/${pgDb}`;

  useEffect(() => {
    if (editingConnection) {
      setUri(editingConnection.uri);
      setDisplayName(editingConnection.name);
      setColor(editingConnection.color);
    } else {
      setUri("");
      setDisplayName("");
      setColor(COLOR_PRESETS[0]);
      setPgHost("localhost");
      setPgPort("5432");
      setPgDb("");
      setPgUser("postgres");
      setPgPass("");
    }
    setTestStatus("idle");
    setTestMsg("");
    setTab("quick");
  }, [editingConnection, open]);

  const getEffectiveUri = () =>
    tab === "quick" ? uri : buildPgUri();

  const runTest = async () => {
    const testUri = getEffectiveUri();
    if (!testUri) {
      setTestStatus("error");
      setTestMsg("Please enter a connection URI or fill in the fields.");
      return;
    }
    setTestStatus("loading");
    setTestMsg("");
    const testId = `__test_${Date.now()}`;
    try {
      const version = await db.connect(testId, testUri);
      setTestStatus("success");
      setTestMsg(`Connected — ${version}`);
      await db.disconnect(testId);
    } catch (err) {
      setTestStatus("error");
      setTestMsg(String(err));
    }
  };

  const handleSave = () => {
    const effectiveUri = getEffectiveUri();
    const name = displayName || (tab === "quick" ? uri.split("@")[1]?.split("/")[1] ?? "New connection" : pgDb || "New connection");
    onSave({ name, color, uri: effectiveUri, type: "postgres" });
  };

  if (!open) return null;

  const TABS: { id: TabMode; label: string }[] = [
    { id: "quick", label: "Quick (URI)" },
    { id: "pg-advanced", label: "PostgreSQL" },
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
            <h2
              className="text-sm font-semibold font-sans"
              style={{ color: "#E8EAFF" }}
            >
              {isEditing ? "Edit Connection" : "New Connection"}
            </h2>
            {isEditing && editingConnection && (
              <p
                className="text-xs font-sans mt-0.5"
                style={{ color: "#484A6E" }}
              >
                {editingConnection.version}
                {editingConnection.lastConnected &&
                  ` · ${editingConnection.lastConnected}`}
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

        {/* Tabs */}
        <div
          className="flex items-center px-5 gap-1"
          style={{ borderBottom: "1px solid #1E1F32" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2.5 text-xs font-sans transition-colors cursor-pointer"
              style={{
                color: tab === t.id ? "#E8EAFF" : "#484A6E",
                borderBottom:
                  tab === t.id
                    ? "2px solid #7C4FD4"
                    : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Quick tab */}
          {tab === "quick" && (
            <Field label="Connection URI">
              <div className="relative">
                <ModalInput
                  value={uri}
                  onChange={setUri}
                  placeholder="postgres://user:pass@host:5432/dbname"
                />
              </div>
            </Field>
          )}

          {/* PG Advanced tab */}
          {tab === "pg-advanced" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Host">
                    <ModalInput
                      value={pgHost}
                      onChange={setPgHost}
                      placeholder="localhost"
                    />
                  </Field>
                </div>
                <Field label="Port">
                  <ModalInput
                    value={pgPort}
                    onChange={setPgPort}
                    placeholder="5432"
                  />
                </Field>
              </div>
              <Field label="Database">
                <ModalInput
                  value={pgDb}
                  onChange={setPgDb}
                  placeholder="my_database"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <ModalInput
                    value={pgUser}
                    onChange={setPgUser}
                    placeholder="postgres"
                  />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <ModalInput
                      value={pgPass}
                      onChange={setPgPass}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                    />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                      style={{ color: "#484A6E" }}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </Field>
              </div>
              <Field label="Schema (optional)">
                <ModalInput
                  value={pgSchema}
                  onChange={setPgSchema}
                  placeholder="public"
                />
              </Field>
              <Field label="SSL Mode">
                <NativeSelect
                  value={pgSSL}
                  onChange={setPgSSL}
                  options={["disable", "require", "verify-ca", "verify-full"]}
                />
              </Field>
              <Field label="SSL Certificate (optional)">
                <div
                  className="border-2 border-dashed rounded-md py-6 flex flex-col items-center gap-2 cursor-pointer"
                  style={{ borderColor: "#282940", color: "#484A6E" }}
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-sans">
                    Drop .pem / .crt here or Browse
                  </span>
                </div>
              </Field>
            </>
          )}

          {/* Shared: name + color picker */}
          <div className="h-px" style={{ background: "#1E1F32" }} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Display name">
              <ModalInput
                value={displayName}
                onChange={setDisplayName}
                placeholder="local-docker"
              />
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
                      boxShadow:
                        color === c
                          ? `0 0 0 2px #191A2A, 0 0 0 3px ${c}`
                          : "none",
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
                    : "#13141F",
                border: `1px solid ${
                  testStatus === "success"
                    ? "rgba(16,185,129,0.3)"
                    : testStatus === "error"
                    ? "rgba(239,68,68,0.3)"
                    : "#1E1F32"
                }`,
                color:
                  testStatus === "success"
                    ? "#10B981"
                    : testStatus === "error"
                    ? "#EF4444"
                    : "#8890BB",
              }}
            >
              {testStatus === "loading" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {testStatus === "success" && (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {testStatus === "error" && <XCircle className="w-4 h-4" />}
              <span className="truncate">
                {testStatus === "loading" ? "Connecting..." : testMsg}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={runTest}
              disabled={testStatus === "loading"}
              className="px-4 py-2 text-sm font-sans rounded-md transition-colors cursor-pointer disabled:opacity-50"
              style={{
                background: "#13141F",
                color: "#8890BB",
                border: "1px solid #282940",
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
                className="px-4 py-2 text-sm font-sans rounded-md transition-colors cursor-pointer"
                style={{ color: "#484A6E" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-sans rounded-md font-medium transition-colors cursor-pointer"
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
