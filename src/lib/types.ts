export type ConnectionStatus = "connected" | "idle" | "connecting" | "error";
export type ConnectionType = "postgres";

export interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  color: string;
  uri: string;
  status: ConnectionStatus;
  version: string;
  lastConnected?: string;
}

export interface TableMeta {
  name: string;
  row_count: number;
  size: string;
}

export interface ColumnDef {
  name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  foreign_key?: string;
  default_value?: string;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_time_ms: number;
}

export interface ForeignKey {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
}

export const COLOR_PRESETS = [
  "#7C4FD4",
  "#4F7EE8",
  "#10B981",
  "#F59E0B",
  "#EF4444",
];

export const SAMPLE_QUERY = `-- Get active records
SELECT *
FROM users
LIMIT 50;`;
