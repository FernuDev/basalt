import { useState, useEffect } from "react";
import { toast } from "sonner";

import { SplashScreen } from "./components/SplashScreen";
import { Topbar } from "./components/db/Topbar";
import { Sidebar } from "./components/db/Sidebar";
import { MainContent, type NavTab } from "./components/db/MainContent";
import { ConnectionModal } from "./components/db/ConnectionModal";
import { Toaster } from "./components/ui/sonner";

import { db, mongo } from "./lib/db";
import { storage } from "./lib/storage";
import type { Connection, TableMeta, ConnectionType } from "./lib/types";

export interface OpenTab {
  id: string;
  table: TableMeta;
  connectionId: string;
  connectionColor: string;
  connectionType: ConnectionType;
  /** Short display label without schema/db prefix */
  label: string;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>(
    storage.loadConnections
  );
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>("tables");
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  // ── Open table tabs ────────────────────────────────────────────────────────
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const activeOpenTab = openTabs.find((t) => t.id === activeTabId) ?? null;
  // activeTable is derived from the active open tab
  const activeTable = activeOpenTab?.table.name ?? null;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    storage.saveConnections(connections);
  }, [connections]);

  const activeConnection = connections.find((c) => c.id === activeConnectionId) ?? null;

  // ── Helpers routed by connection type ──────────────────────────────────────
  async function connectAndList(id: string, conn: Connection): Promise<TableMeta[]> {
    if (conn.type === "mongodb") {
      const version = await mongo.connect(id, conn.uri);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "connected", version, lastConnected: new Date().toLocaleString() }
            : c
        )
      );
      return mongo.listCollections(id);
    } else {
      const version = await db.connect(id, conn.uri);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "connected", version, lastConnected: new Date().toLocaleString() }
            : c
        )
      );
      return db.listTables(id);
    }
  }

  async function listItems(id: string, conn: Connection): Promise<TableMeta[]> {
    return conn.type === "mongodb"
      ? mongo.listCollections(id)
      : db.listTables(id);
  }

  async function disconnectConn(id: string, conn: Connection) {
    if (conn.type === "mongodb") {
      await mongo.disconnect(id);
    } else {
      await db.disconnect(id);
    }
  }

  // ── activateConnection ─────────────────────────────────────────────────────
  async function activateConnection(id: string) {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;

    // Already connected: just switch and re-list
    if (conn.status === "connected") {
      setActiveConnectionId(id);
      setTables([]);
      setTablesLoading(true);
      try {
        const t = await listItems(id, conn);
        setTables(t);
      } catch (err) {
        toast.error(`Failed to list: ${err}`);
      } finally {
        setTablesLoading(false);
      }
      return;
    }

    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "connecting" } : c))
    );
    setActiveConnectionId(id);
    setTables([]);
    setTablesLoading(true);

    try {
      const t = await connectAndList(id, conn);
      setTables(t);
    } catch (err) {
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "error" } : c))
      );
      toast.error(`Connection failed: ${err}`);
    } finally {
      setTablesLoading(false);
    }
  }

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const openNewModal = () => { setEditingConnection(null); setModalOpen(true); };
  const openEditModal = (conn: Connection) => { setEditingConnection(conn); setModalOpen(true); };

  const handleSaveConnection = (partial: Partial<Connection>) => {
    if (editingConnection) {
      setConnections((prev) =>
        prev.map((c) => (c.id === editingConnection.id ? { ...c, ...partial } : c))
      );
    } else {
      const newConn: Connection = {
        id: crypto.randomUUID(),
        name: partial.name ?? "New connection",
        type: partial.type ?? "postgres",
        color: partial.color ?? "#7C4FD4",
        uri: partial.uri ?? "",
        status: "idle",
        version: "",
        lastConnected: undefined,
      };
      setConnections((prev) => [...prev, newConn]);
    }
    setModalOpen(false);
  };

  const handleDeleteConnection = async (id: string) => {
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      try { await disconnectConn(id, conn); } catch { /* ignore */ }
    }
    setConnections((prev) => prev.filter((c) => c.id !== id));
    // Close all tabs belonging to this connection
    setOpenTabs((prev) => prev.filter((t) => t.connectionId !== id));
    setActiveTabId((prev) => {
      const kept = openTabs.filter((t) => t.connectionId !== id);
      return kept.find((t) => t.id === prev)?.id ?? kept[kept.length - 1]?.id ?? null;
    });
    if (activeConnectionId === id) {
      setActiveConnectionId(null);
      setTables([]);
    }
  };

  const handleToggleConnect = async (id: string) => {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;
    if (conn.status === "connected") {
      try {
        await disconnectConn(id, conn);
        setConnections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "idle" } : c))
        );
        if (activeConnectionId === id) { setTables([]); }
        // Close tabs from this connection
        setOpenTabs((prev) => prev.filter((t) => t.connectionId !== id));
        setActiveTabId((prev) => {
          const kept = openTabs.filter((t) => t.connectionId !== id);
          return kept.find((t) => t.id === prev)?.id ?? kept[kept.length - 1]?.id ?? null;
        });
      } catch (err) {
        toast.error(`Disconnect failed: ${err}`);
      }
    } else {
      await activateConnection(id);
    }
  };

  // ── Table tab management ───────────────────────────────────────────────────
  const handleOpenTable = (tableName: string) => {
    const conn = connections.find((c) => c.id === activeConnectionId);
    if (!conn) return;

    // Reuse existing tab if already open
    const existing = openTabs.find(
      (t) => t.table.name === tableName && t.connectionId === conn.id
    );
    if (existing) {
      setActiveTabId(existing.id);
      setActiveTab("tables");
      return;
    }

    const tableMeta = tables.find((t) => t.name === tableName) ?? {
      name: tableName,
      row_count: 0,
      size: "—",
    };
    const label = tableName.includes(".")
      ? tableName.split(".", 2)[1]
      : tableName;

    const newTab: OpenTab = {
      id: crypto.randomUUID(),
      table: tableMeta,
      connectionId: conn.id,
      connectionColor: conn.color,
      connectionType: conn.type,
      label,
    };
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setActiveTab("tables");
  };

  const handleCloseTab = (tabId: string) => {
    const idx = openTabs.findIndex((t) => t.id === tabId);
    const next = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(next);

    if (activeTabId === tabId) {
      const fallback = next[Math.min(idx, next.length - 1)];
      if (fallback) {
        setActiveTabId(fallback.id);
        // Switch connection if the fallback tab belongs to a different one
        if (fallback.connectionId !== activeConnectionId) {
          activateConnection(fallback.connectionId);
        }
      } else {
        setActiveTabId(null);
      }
    }
  };

  const handleSelectOpenTab = (tab: OpenTab) => {
    setActiveTabId(tab.id);
    setActiveTab("tables");
    // Switch connection context if needed
    if (tab.connectionId !== activeConnectionId) {
      activateConnection(tab.connectionId);
    }
  };

  const handleRefreshTables = async () => {
    if (!activeConnectionId || !activeConnection) return;
    setTablesLoading(true);
    try {
      const t = await listItems(activeConnectionId, activeConnection);
      setTables(t);
    } catch (err) {
      toast.error(`Failed to refresh: ${err}`);
    } finally {
      setTablesLoading(false);
    }
  };

  return (
    <>
      <SplashScreen visible={isLoading} />

      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "radial-gradient(ellipse 55% 45% at 85% 90%, rgba(124,79,212,0.1) 0%, transparent 65%), #0A0B13",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 400ms ease",
        }}
      >
        <Topbar
          openTabs={openTabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectOpenTab}
          onCloseTab={handleCloseTab}
          onNewConnection={openNewModal}
        />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar
            connections={connections}
            tables={tables}
            tablesLoading={tablesLoading}
            activeConnectionId={activeConnectionId}
            activeTable={activeTable}
            onSelectConnection={activateConnection}
            onSelectTable={handleOpenTable}
            onEditConnection={openEditModal}
            onDeleteConnection={handleDeleteConnection}
            onToggleConnect={handleToggleConnect}
            onRefreshTables={handleRefreshTables}
          />

          <MainContent
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); }}
            activeTable={activeTable}
            onOpenTable={handleOpenTable}
            onCloseTab={handleCloseTab}
            activeTabId={activeTabId}
            connection={activeConnection}
            tables={tables}
            tablesLoading={tablesLoading}
          />
        </div>

        <ConnectionModal
          open={modalOpen}
          editingConnection={editingConnection}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveConnection}
        />
      </div>

      <Toaster />
    </>
  );
}
