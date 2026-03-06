import { useState, useEffect } from "react";
import { toast } from "sonner";

import { SplashScreen } from "./components/SplashScreen";
import { Topbar } from "./components/db/Topbar";
import { Sidebar } from "./components/db/Sidebar";
import { MainContent, type NavTab } from "./components/db/MainContent";
import { ConnectionModal } from "./components/db/ConnectionModal";
import { Toaster } from "./components/ui/sonner";

import { db } from "./lib/db";
import { storage } from "./lib/storage";
import type { Connection, TableMeta } from "./lib/types";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>(
    storage.loadConnections
  );
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>("tables");
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [tables, setTables] = useState<TableMeta[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Persist connections on change
  useEffect(() => {
    storage.saveConnections(connections);
  }, [connections]);

  const activeConnection = connections.find((c) => c.id === activeConnectionId) ?? null;

  async function activateConnection(id: string) {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;

    // If already connected in our state, just switch to it
    if (conn.status === "connected") {
      setActiveConnectionId(id);
      setActiveTable(null);
      try {
        const t = await db.listTables(id);
        setTables(t);
      } catch (err) {
        toast.error(`Failed to list tables: ${err}`);
      }
      return;
    }

    // Connect
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "connecting" } : c))
    );
    setActiveConnectionId(id);
    setActiveTable(null);

    try {
      const version = await db.connect(id, conn.uri);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "connected", version, lastConnected: new Date().toLocaleString() }
            : c
        )
      );
      const t = await db.listTables(id);
      setTables(t);
    } catch (err) {
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "error" } : c))
      );
      toast.error(`Connection failed: ${err}`);
    }
  }

  const openNewModal = () => {
    setEditingConnection(null);
    setModalOpen(true);
  };

  const openEditModal = (conn: Connection) => {
    setEditingConnection(conn);
    setModalOpen(true);
  };

  const handleSaveConnection = (partial: Partial<Connection>) => {
    if (editingConnection) {
      setConnections((prev) =>
        prev.map((c) =>
          c.id === editingConnection.id ? { ...c, ...partial } : c
        )
      );
    } else {
      const newConn: Connection = {
        id: crypto.randomUUID(),
        name: partial.name ?? "New connection",
        type: "postgres",
        color: partial.color ?? "#4F7EE8",
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
    try {
      await db.disconnect(id);
    } catch {
      // Ignore disconnect errors on delete
    }
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (activeConnectionId === id) {
      setActiveConnectionId(null);
      setTables([]);
      setActiveTable(null);
    }
  };

  const handleToggleConnect = async (id: string) => {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;

    if (conn.status === "connected") {
      try {
        await db.disconnect(id);
        setConnections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "idle" } : c))
        );
        if (activeConnectionId === id) {
          setTables([]);
          setActiveTable(null);
        }
      } catch (err) {
        toast.error(`Disconnect failed: ${err}`);
      }
    } else {
      await activateConnection(id);
    }
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== "tables") setActiveTable(null);
  };

  const handleSelectTable = async (name: string) => {
    setActiveTable(name);
    setActiveTab("tables");
  };

  const handleSelectConnection = async (id: string) => {
    await activateConnection(id);
  };

  const handleRefreshTables = async () => {
    if (!activeConnectionId) return;
    try {
      const t = await db.listTables(activeConnectionId);
      setTables(t);
    } catch (err) {
      toast.error(`Failed to refresh tables: ${err}`);
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
          connections={connections}
          activeConnectionId={activeConnectionId}
          onSelectConnection={handleSelectConnection}
          onNewConnection={openNewModal}
        />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar
            connections={connections}
            tables={tables}
            activeConnectionId={activeConnectionId}
            activeTable={activeTable}
            onSelectConnection={handleSelectConnection}
            onSelectTable={handleSelectTable}
            onEditConnection={openEditModal}
            onDeleteConnection={handleDeleteConnection}
            onToggleConnect={handleToggleConnect}
            onRefreshTables={handleRefreshTables}
          />

          <MainContent
            activeTab={activeTab}
            onTabChange={handleSelectTab}
            activeTable={activeTable}
            onOpenTable={(name) => {
              setActiveTable(name);
              setActiveTab("tables");
            }}
            onCloseTable={() => setActiveTable(null)}
            connection={activeConnection}
            tables={tables}
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
