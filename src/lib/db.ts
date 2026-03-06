import { invoke } from "@tauri-apps/api/core";
import type { ColumnDef, ForeignKey, QueryResult, TableMeta } from "./types";

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
