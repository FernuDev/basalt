export type ConnectionStatus = "connected" | "idle" | "connecting" | "error";
export type ConnectionType = "postgres" | "mongo";

export interface Connection {
  id: number;
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
  rows: number;
  relations: string[];
  size: string;
}

export interface ColumnDef {
  name: string;
  type: string;
  pk: boolean;
  nullable: boolean;
  fk?: string;
  default?: string;
}

export interface Relation {
  from: string;
  to: string;
  fromCol: string;
  toCol: string;
  type: string;
}

export const CONNECTIONS: Connection[] = [
  {
    id: 1,
    name: "local-docker",
    type: "postgres",
    color: "#3B82F6",
    uri: "postgres://postgres:pass@localhost:5432/mydb",
    status: "connected",
    version: "PostgreSQL 16.2",
    lastConnected: "2 minutes ago",
  },
  {
    id: 2,
    name: "staging-railway",
    type: "postgres",
    color: "#8B5CF6",
    uri: "postgres://user:pass@railway.app:5432/staging",
    status: "connected",
    version: "PostgreSQL 15.4",
    lastConnected: "14 minutes ago",
  },
  {
    id: 3,
    name: "prod-mongo",
    type: "mongo",
    color: "#10B981",
    uri: "mongodb+srv://user:pass@cluster0.abc12.mongodb.net/app",
    status: "idle",
    version: "MongoDB 7.0.5",
    lastConnected: "2 hours ago",
  },
];

export const TABLES: TableMeta[] = [
  { name: "users",    rows: 12480,  relations: ["orders", "sessions"],  size: "4.2 MB" },
  { name: "projects", rows: 3241,   relations: ["services", "users"],   size: "1.1 MB" },
  { name: "services", rows: 892,    relations: ["projects", "trains"],  size: "340 KB" },
  { name: "trains",   rows: 156,    relations: ["services"],            size: "48 KB"  },
  { name: "orders",   rows: 48920,  relations: ["users", "products"],   size: "22 MB"  },
  { name: "products", rows: 2103,   relations: ["orders"],              size: "890 KB" },
];

export const USERS_COLUMNS: ColumnDef[] = [
  { name: "id",         type: "INT8",      pk: true,  nullable: false },
  { name: "email",      type: "VARCHAR",   pk: false, nullable: false },
  { name: "name",       type: "VARCHAR",   pk: false, nullable: true  },
  { name: "created_at", type: "TIMESTAMP", pk: false, nullable: false },
  { name: "role",       type: "VARCHAR",   pk: false, nullable: false },
  { name: "status",     type: "VARCHAR",   pk: false, nullable: false },
  { name: "metadata",   type: "JSONB",     pk: false, nullable: true  },
];

export const USERS_ROWS = [
  [1, "ana@example.com",    "Ana García",    "2024-01-12 09:14", "admin",  "active",   "{...}"],
  [2, "carlos@dev.io",      "Carlos Ruiz",   "2024-02-03 14:22", "user",   "active",   null   ],
  [3, "maria@corp.mx",      "María López",   "2024-03-18 11:05", "user",   "inactive", null   ],
  [4, "jose@test.com",      "José Martínez", "2024-04-01 16:40", "editor", "active",   "{...}"],
  [5, "lucia@example.mx",   "Lucía Herrera", "2024-04-22 08:30", "user",   "active",   null   ],
];

export const RELATIONS: Relation[] = [
  { from: "users",    to: "orders",   fromCol: "id",         toCol: "user_id",    type: "1:N" },
  { from: "projects", to: "services", fromCol: "id",         toCol: "project_id", type: "1:N" },
  { from: "services", to: "trains",   fromCol: "id",         toCol: "service_id", type: "1:N" },
  { from: "projects", to: "users",    fromCol: "owner_id",   toCol: "id",         type: "N:1" },
  { from: "orders",   to: "products", fromCol: "product_id", toCol: "id",         type: "N:1" },
];

export const COLOR_PRESETS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

export const SAMPLE_QUERY = `-- Get active users with their order counts
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  COUNT(o.id) AS order_count,
  MAX(o.created_at) AS last_order
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.status = 'active'
GROUP BY u.id, u.email, u.name, u.role
ORDER BY order_count DESC
LIMIT 50;`;

export const QUERY_RESULTS = [
  [1, "ana@example.com",    "Ana García",    "admin",  3, "2024-04-18 10:22"],
  [4, "jose@test.com",      "José Martínez", "editor", 2, "2024-04-15 08:11"],
  [2, "carlos@dev.io",      "Carlos Ruiz",   "user",   1, "2024-03-30 14:55"],
  [5, "lucia@example.mx",   "Lucía Herrera", "user",   1, "2024-04-01 09:43"],
];

export const QUERY_RESULT_COLUMNS: ColumnDef[] = [
  { name: "id",          type: "INT8",      pk: true,  nullable: false },
  { name: "email",       type: "VARCHAR",   pk: false, nullable: false },
  { name: "name",        type: "VARCHAR",   pk: false, nullable: true  },
  { name: "role",        type: "VARCHAR",   pk: false, nullable: false },
  { name: "order_count", type: "INT8",      pk: false, nullable: false },
  { name: "last_order",  type: "TIMESTAMP", pk: false, nullable: true  },
];
