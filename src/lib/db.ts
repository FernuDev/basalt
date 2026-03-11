import { invoke } from "@tauri-apps/api/core";
import type { ColumnDef, ForeignKey, QueryResult, TableMeta } from "./types";

// ── File utilities ────────────────────────────────────────────────────────────
export const files = {
  /** Write CSV text to the given absolute path. */
  saveCsv: (path: string, content: string): Promise<void> =>
    invoke("save_csv", { path, content }),
};

// ── PostgreSQL ────────────────────────────────────────────────────────────────
export const db = {
  connect: (id: string, uri: string): Promise<string> =>
    invoke("pg_connect", { id, uri }),

  disconnect: (id: string): Promise<void> =>
    invoke("pg_disconnect", { id }),

  listTables: (id: string): Promise<TableMeta[]> =>
    invoke("pg_list_tables", { id }),

  describeTable: (id: string, table: string): Promise<ColumnDef[]> =>
    invoke("pg_describe_table", { id, table }),

  getTableData: (
    id: string,
    table: string,
    limit = 100,
    offset = 0
  ): Promise<QueryResult> =>
    invoke("pg_get_table_data", { id, table, limit, offset }),

  executeQuery: (id: string, sql: string): Promise<QueryResult> =>
    invoke("pg_execute_query", { id, sql }),

  getForeignKeys: (id: string): Promise<ForeignKey[]> =>
    invoke("pg_get_foreign_keys", { id }),
};

// ── MongoDB ───────────────────────────────────────────────────────────────────
export const mongo = {
  connect: (id: string, uri: string): Promise<string> =>
    invoke("mg_connect", { id, uri }),

  disconnect: (id: string): Promise<void> =>
    invoke("mg_disconnect", { id }),

  listCollections: (id: string): Promise<TableMeta[]> =>
    invoke("mg_list_collections", { id }),

  getCollectionSchema: (id: string, collection: string): Promise<ColumnDef[]> =>
    invoke("mg_get_collection_schema", { id, collection }),

  getCollectionData: (
    id: string,
    collection: string,
    limit = 100,
    offset = 0
  ): Promise<QueryResult> =>
    invoke("mg_get_collection_data", { id, collection, limit, offset }),

  executeQuery: (
    id: string,
    collection: string,
    filterJson: string,
    operation: "find" | "count" | "aggregate"
  ): Promise<QueryResult> =>
    invoke("mg_execute_query", { id, collection, filterJson: filterJson, operation }),

  updateDocument: (
    id: string,
    collection: string,
    docId: string,
    updatesJson: string
  ): Promise<void> =>
    invoke("mg_update_document", { id, collection, docId, updatesJson }),
};
