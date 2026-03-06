use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Column, Row, TypeInfo, ValueRef};
use std::time::Instant;

use crate::db::DbState;
use crate::types::{ColumnDef, ForeignKey, QueryResult, TableMeta};

/// Split "schema.table" into (schema, table). Falls back to ("public", name).
fn parse_table_ref(name: &str) -> (String, String) {
    if let Some((schema, table)) = name.split_once('.') {
        (schema.to_string(), table.to_string())
    } else {
        ("public".to_string(), name.to_string())
    }
}

/// Produce a safe SQL table reference.
/// Accepts "table" or "schema.table" and double-quotes each part.
fn sanitize_identifier(name: &str) -> String {
    if let Some((schema, table)) = name.split_once('.') {
        format!(
            "\"{}\".\"{}\"",
            schema.replace('"', ""),
            table.replace('"', "")
        )
    } else {
        format!("\"{}\"", name.replace('"', ""))
    }
}

fn serialize_row(row: &sqlx::postgres::PgRow) -> Result<Vec<serde_json::Value>, String> {
    use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, Utc};

    let cols = row.columns();
    let mut values = Vec::with_capacity(cols.len());
    for i in 0..cols.len() {
        let raw = row
            .try_get_raw(i)
            .map_err(|e| format!("column {i} raw error: {e}"))?;
        let val = if raw.is_null() {
            serde_json::Value::Null
        } else {
            match raw.type_info().name() {
                "INT2" | "INT4" => json!(row.try_get::<i32, _>(i).unwrap_or(0)),
                "INT8" => json!(row.try_get::<i64, _>(i).unwrap_or(0)),
                "FLOAT4" => json!(row.try_get::<f32, _>(i).map(|v| v as f64).unwrap_or(0.0)),
                "FLOAT8" => json!(row.try_get::<f64, _>(i).unwrap_or(0.0)),
                "BOOL" => json!(row.try_get::<bool, _>(i).unwrap_or(false)),

                // UUID must be decoded as uuid::Uuid, not as String
                "UUID" => json!(
                    row.try_get::<uuid::Uuid, _>(i)
                        .map(|u| u.to_string())
                        .unwrap_or_default()
                ),

                // Temporal types require chrono, not raw String decode
                "TIMESTAMPTZ" => json!(
                    row.try_get::<DateTime<Utc>, _>(i)
                        .map(|t: DateTime<Utc>| t.to_rfc3339())
                        .unwrap_or_default()
                ),
                "TIMESTAMP" => json!(
                    row.try_get::<NaiveDateTime, _>(i)
                        .map(|t: NaiveDateTime| t.to_string())
                        .unwrap_or_default()
                ),
                "DATE" => json!(
                    row.try_get::<NaiveDate, _>(i)
                        .map(|d: NaiveDate| d.to_string())
                        .unwrap_or_default()
                ),
                "TIME" | "TIMETZ" => json!(
                    row.try_get::<NaiveTime, _>(i)
                        .map(|t: NaiveTime| t.to_string())
                        .unwrap_or_default()
                ),

                // JSONB/JSON: decode as serde_json::Value directly
                "JSONB" | "JSON" => row
                    .try_get::<serde_json::Value, _>(i)
                    .unwrap_or(serde_json::Value::Null),

                // Binary: hex-encode
                "BYTEA" => {
                    let bytes: Vec<u8> = row.try_get(i).unwrap_or_default();
                    let hex: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
                    json!(format!("\\x{hex}"))
                }

                // TEXT, VARCHAR, CHAR, BPCHAR, NUMERIC, DECIMAL, INTERVAL, INET, CIDR, etc.
                other => match row.try_get::<String, _>(i) {
                    Ok(s) => json!(s),
                    Err(_) => json!(format!("[{other}]")),
                },
            }
        };
        values.push(val);
    }
    Ok(values)
}

#[tauri::command]
pub async fn pg_connect(
    state: tauri::State<'_, DbState>,
    id: String,
    uri: String,
) -> Result<String, String> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&uri)
        .await
        .map_err(|e| format!("Connection failed: {e}"))?;

    let version: String = sqlx::query_scalar("SELECT version()")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Version query failed: {e}"))?;

    let short_version = version
        .split_whitespace()
        .take(2)
        .collect::<Vec<_>>()
        .join(" ");

    let mut state = state.0.lock().await;
    state.insert(id, pool);

    Ok(short_version)
}

#[tauri::command]
pub async fn pg_disconnect(
    state: tauri::State<'_, DbState>,
    id: String,
) -> Result<(), String> {
    let mut state = state.0.lock().await;
    if let Some(pool) = state.remove(&id) {
        pool.close().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn pg_list_tables(
    state: tauri::State<'_, DbState>,
    id: String,
) -> Result<Vec<TableMeta>, String> {
    let state = state.0.lock().await;
    let pool = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let rows = sqlx::query(
        r#"
        SELECT
            t.table_schema,
            t.table_name,
            COALESCE(s.n_live_tup, 0) AS row_count,
            pg_size_pretty(
                pg_total_relation_size(
                    (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
                )
            ) AS size
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s
            ON s.relname = t.table_name AND s.schemaname = t.table_schema
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_schema, t.table_name
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("List tables failed: {e}"))?;

    let tables = rows
        .iter()
        .map(|row| {
            let schema: String = row.get("table_schema");
            let table: String = row.get("table_name");
            // Use "schema.table" as the identifier so downstream commands
            // can query it unambiguously. For the default "public" schema
            // we still keep the full form for consistency.
            let name = format!("{schema}.{table}");
            TableMeta {
                name,
                row_count: row.get::<i64, _>("row_count"),
                size: row.get::<String, _>("size"),
            }
        })
        .collect();

    Ok(tables)
}

#[tauri::command]
pub async fn pg_describe_table(
    state: tauri::State<'_, DbState>,
    id: String,
    table: String,
) -> Result<Vec<ColumnDef>, String> {
    let state = state.0.lock().await;
    let pool = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    // Accept both "schema.table" and "table" formats.
    let (schema_name, table_name) = parse_table_ref(&table);

    let rows = sqlx::query(
        r#"
        SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
            fk_ref.foreign_table_name || '.' || fk_ref.foreign_column_name AS foreign_key
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_name = $1
              AND tc.table_schema = $2
        ) pk ON pk.column_name = c.column_name
        LEFT JOIN (
            SELECT
                kcu.column_name,
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name   AS foreign_table_name,
                ccu.column_name  AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema   = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name   = $1
              AND tc.table_schema = $2
        ) fk_ref ON fk_ref.column_name = c.column_name
        WHERE c.table_name = $1
          AND c.table_schema = $2
        ORDER BY c.ordinal_position
        "#,
    )
    .bind(&table_name)
    .bind(&schema_name)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Describe table failed: {e}"))?;

    let columns = rows
        .iter()
        .map(|row| ColumnDef {
            name: row.get::<String, _>("column_name"),
            data_type: row.get::<String, _>("data_type"),
            is_nullable: row.get::<String, _>("is_nullable") == "YES",
            is_primary_key: row.get::<bool, _>("is_primary_key"),
            // "schema.table.column" — parsed on the frontend
            foreign_key: {
                let fk_schema: Option<String> = row.try_get("foreign_table_schema").ok();
                let fk_table: Option<String>  = row.try_get("foreign_table_name").ok();
                let fk_col: Option<String>    = row.try_get("foreign_column_name").ok();
                match (fk_schema, fk_table, fk_col) {
                    (Some(s), Some(t), Some(c))
                        if !s.is_empty() && !t.is_empty() && !c.is_empty() =>
                    {
                        Some(format!("{s}.{t}.{c}"))
                    }
                    _ => None,
                }
            },
            default_value: row.try_get::<String, _>("column_default").ok(),
        })
        .collect();

    Ok(columns)
}

#[tauri::command]
pub async fn pg_get_table_data(
    state: tauri::State<'_, DbState>,
    id: String,
    table: String,
    limit: i64,
    offset: i64,
) -> Result<QueryResult, String> {
    let state = state.0.lock().await;
    let pool = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let safe_table = sanitize_identifier(&table);
    let sql = format!("SELECT * FROM {safe_table} LIMIT $1 OFFSET $2");

    let start = Instant::now();
    let rows = sqlx::query(&sql)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Get table data failed: {e}"))?;
    let execution_time_ms = start.elapsed().as_millis();

    let (schema_name, table_name) = parse_table_ref(&table);
    let columns = if let Some(first) = rows.first() {
        first
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect()
    } else {
        // Get column names even for empty tables
        let col_rows = sqlx::query(
            "SELECT column_name FROM information_schema.columns \
             WHERE table_name = $1 AND table_schema = $2 ORDER BY ordinal_position"
        )
        .bind(&table_name)
        .bind(&schema_name)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Get columns failed: {e}"))?;
        col_rows
            .iter()
            .map(|r| r.get::<String, _>("column_name"))
            .collect()
    };

    let mut result_rows = Vec::with_capacity(rows.len());
    for row in &rows {
        result_rows.push(serialize_row(row)?);
    }

    Ok(QueryResult {
        columns,
        row_count: result_rows.len(),
        rows: result_rows,
        execution_time_ms,
    })
}

#[tauri::command]
pub async fn pg_execute_query(
    state: tauri::State<'_, DbState>,
    id: String,
    sql: String,
) -> Result<QueryResult, String> {
    let state = state.0.lock().await;
    let pool = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let start = Instant::now();
    let rows = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    let execution_time_ms = start.elapsed().as_millis();

    let columns = if let Some(first) = rows.first() {
        first
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect()
    } else {
        vec![]
    };

    let mut result_rows = Vec::with_capacity(rows.len());
    for row in &rows {
        result_rows.push(serialize_row(row)?);
    }

    Ok(QueryResult {
        columns,
        row_count: result_rows.len(),
        rows: result_rows,
        execution_time_ms,
    })
}

#[tauri::command]
pub async fn pg_get_foreign_keys(
    state: tauri::State<'_, DbState>,
    id: String,
) -> Result<Vec<ForeignKey>, String> {
    let state = state.0.lock().await;
    let pool = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let rows = sqlx::query(
        r#"
        SELECT
            kcu.table_schema  AS from_schema,
            kcu.table_name    AS from_table,
            kcu.column_name   AS from_column,
            ccu.table_schema  AS to_schema,
            ccu.table_name    AS to_table,
            ccu.column_name   AS to_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema   = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY kcu.table_schema, kcu.table_name, kcu.column_name
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Get foreign keys failed: {e}"))?;

    let keys = rows
        .iter()
        .map(|row| {
            let from_schema: String = row.get("from_schema");
            let from_table: String = row.get("from_table");
            let to_schema: String = row.get("to_schema");
            let to_table: String = row.get("to_table");
            ForeignKey {
                from_table: format!("{from_schema}.{from_table}"),
                from_column: row.get::<String, _>("from_column"),
                to_table: format!("{to_schema}.{to_table}"),
                to_column: row.get::<String, _>("to_column"),
            }
        })
        .collect();

    Ok(keys)
}
