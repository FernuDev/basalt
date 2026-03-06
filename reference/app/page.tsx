"use client";
import { useState } from "react";
import { Topbar } from "@/components/db/Topbar";
import { Sidebar } from "@/components/db/Sidebar";
import { MainContent, type NavTab } from "@/components/db/MainContent";
import { ConnectionModal } from "@/components/db/ConnectionModal";
import { CONNECTIONS, type Connection, type ConnectionStatus } from "@/lib/mock-data";
import { TABLES } from "@/lib/mock-data";

export default function Page() {
  const [connections, setConnections] = useState<Connection[]>(CONNECTIONS);
  const [activeConnectionId, setActiveConnectionId] = useState(1);
  const [activeTab, setActiveTab] = useState<NavTab>("tables");
  const [activeTable, setActiveTable] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

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
        id: Date.now(),
        name: partial.name ?? "New connection",
        type: partial.type ?? "postgres",
        color: partial.color ?? "#3B82F6",
        uri: partial.uri ?? "",
        status: "connecting",
        version: "",
        lastConnected: "Never",
      };
      setConnections((prev) => [...prev, newConn]);
      setActiveConnectionId(newConn.id);
      // Simulate connecting
      setTimeout(() => {
        setConnections((prev) =>
          prev.map((c) => (c.id === newConn.id ? { ...c, status: "connected" as ConnectionStatus } : c))
        );
      }, 1200);
    }
    setModalOpen(false);
  };

  const handleDeleteConnection = (id: number) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (activeConnectionId === id) {
      const remaining = connections.filter((c) => c.id !== id);
      if (remaining.length > 0) setActiveConnectionId(remaining[0].id);
    }
  };

  const handleToggleConnect = (id: number) => {
    setConnections((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === "connected") return { ...c, status: "idle" as ConnectionStatus };
        // Connect: first amber, then green
        setTimeout(() => {
          setConnections((prev2) =>
            prev2.map((c2) =>
              c2.id === id ? { ...c2, status: "connected" as ConnectionStatus } : c2
            )
          );
        }, 1000);
        return { ...c, status: "connecting" as ConnectionStatus };
      })
    );
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== "tables") setActiveTable(null);
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}
    >
      {/* Topbar */}
      <Topbar
        connections={connections}
        activeConnectionId={activeConnectionId}
        onSelectConnection={(id) => {
          setActiveConnectionId(id);
          setActiveTable(null);
        }}
        onNewConnection={openNewModal}
      />

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          connections={connections}
          tables={TABLES}
          activeConnectionId={activeConnectionId}
          activeTable={activeTable}
          onSelectConnection={(id) => {
            setActiveConnectionId(id);
            setActiveTable(null);
          }}
          onSelectTable={(name) => {
            setActiveTable(name);
            setActiveTab("tables");
          }}
          onEditConnection={openEditModal}
          onDeleteConnection={handleDeleteConnection}
          onToggleConnect={handleToggleConnect}
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
        />
      </div>

      {/* Connection modal */}
      <ConnectionModal
        open={modalOpen}
        editingConnection={editingConnection}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveConnection}
      />
    </div>
  );
}
