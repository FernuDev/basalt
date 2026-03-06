import type { Connection } from "./types";

const KEY = "basalt:connections";

export const storage = {
  loadConnections: (): Connection[] => {
    try {
      const raw: Connection[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      // Reset status on every app start — the Rust pool is always empty at boot.
      return raw.map((c) => ({ ...c, status: "idle" }));
    } catch {
      return [];
    }
  },
  saveConnections: (connections: Connection[]) => {
    localStorage.setItem(KEY, JSON.stringify(connections));
  },
};
