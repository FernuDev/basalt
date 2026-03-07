use bson::{doc, Bson, Document};
use futures::TryStreamExt;
use mongodb::options::{ClientOptions, FindOptions};
use serde_json::{json, Value as JsonValue};
use std::time::Instant;

use crate::mongo::MongoState;
use crate::types::{ColumnDef, QueryResult, TableMeta};

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Convert a BSON value to a serde_json::Value.
fn bson_to_json(bson: &Bson) -> JsonValue {
    match bson {
        Bson::Double(v) => json!(v),
        Bson::String(v) => json!(v),
        Bson::Boolean(v) => json!(v),
        Bson::Null => JsonValue::Null,
        Bson::Int32(v) => json!(v),
        Bson::Int64(v) => json!(v),
        Bson::ObjectId(oid) => json!(oid.to_hex()),
        Bson::DateTime(dt) => json!(dt.to_chrono().to_rfc3339()),
        Bson::Array(arr) => {
            JsonValue::Array(arr.iter().map(bson_to_json).collect())
        }
        Bson::Document(doc) => {
            let mut map = serde_json::Map::new();
            for (k, v) in doc {
                map.insert(k.clone(), bson_to_json(v));
            }
            JsonValue::Object(map)
        }
        Bson::Decimal128(d) => json!(d.to_string()),
        Bson::Binary(b) => json!(hex::encode(&b.bytes)),
        Bson::Timestamp(ts) => json!(format!("Timestamp({}, {})", ts.time, ts.increment)),
        Bson::RegularExpression(re) => json!(format!("/{}/{}", re.pattern, re.options)),
        Bson::Undefined | Bson::MinKey | Bson::MaxKey => JsonValue::Null,
        // Fallback: serialize via the BSON extended-JSON representation
        other => {
            serde_json::to_value(other).unwrap_or(JsonValue::Null)
        }
    }
}

/// Infer a friendly BSON type name from a value.
fn bson_type_name(bson: &Bson) -> &'static str {
    match bson {
        Bson::Double(_) => "double",
        Bson::String(_) => "string",
        Bson::Boolean(_) => "bool",
        Bson::Null => "null",
        Bson::Int32(_) => "int32",
        Bson::Int64(_) => "int64",
        Bson::ObjectId(_) => "objectId",
        Bson::DateTime(_) => "date",
        Bson::Array(_) => "array",
        Bson::Document(_) => "object",
        Bson::Decimal128(_) => "decimal128",
        Bson::Binary(_) => "binary",
        _ => "unknown",
    }
}

/// Split "database.collection" — falls back to ("test", name).
fn parse_collection_ref(name: &str) -> (String, String) {
    if let Some((db, coll)) = name.split_once('.') {
        (db.to_string(), coll.to_string())
    } else {
        ("test".to_string(), name.to_string())
    }
}

/// Flatten a BSON document into (column_name, json_value) pairs.
/// Nested documents/arrays are serialized as JSON strings for table display.
fn flatten_doc(doc: &Document) -> Vec<(String, JsonValue)> {
    let mut pairs = Vec::new();
    for (key, val) in doc {
        let json_val = match val {
            Bson::Document(_) | Bson::Array(_) => {
                json!(serde_json::to_string(&bson_to_json(val)).unwrap_or_default())
            }
            other => bson_to_json(other),
        };
        pairs.push((key.clone(), json_val));
    }
    pairs
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn mg_connect(
    state: tauri::State<'_, MongoState>,
    id: String,
    uri: String,
) -> Result<String, String> {
    let mut opts = ClientOptions::parse(&uri)
        .await
        .map_err(|e| format!("Invalid MongoDB URI: {e}"))?;

    // Force a short server selection timeout for quick failures
    opts.server_selection_timeout = Some(std::time::Duration::from_secs(8));
    opts.connect_timeout = Some(std::time::Duration::from_secs(8));

    let client = mongodb::Client::with_options(opts)
        .map_err(|e| format!("Failed to create client: {e}"))?;

    // Ping to verify the connection is reachable
    client
        .database("admin")
        .run_command(doc! { "ping": 1 })
        .await
        .map_err(|e| format!("Connection failed: {e}"))?;

    // Get server version
    let build_info: Document = client
        .database("admin")
        .run_command(doc! { "buildInfo": 1 })
        .await
        .map_err(|e| format!("buildInfo failed: {e}"))?;

    let version = build_info
        .get_str("version")
        .unwrap_or("unknown")
        .to_string();

    let mut state = state.0.lock().await;
    state.insert(id, client);

    Ok(format!("MongoDB {version}"))
}

#[tauri::command]
pub async fn mg_disconnect(
    state: tauri::State<'_, MongoState>,
    id: String,
) -> Result<(), String> {
    let mut state = state.0.lock().await;
    state.remove(&id);
    Ok(())
}

#[tauri::command]
pub async fn mg_list_collections(
    state: tauri::State<'_, MongoState>,
    id: String,
) -> Result<Vec<TableMeta>, String> {
    let state = state.0.lock().await;
    let client = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    // Skip system/internal databases
    let skip_dbs = ["admin", "local", "config"];
    let db_names: Vec<String> = client
        .list_database_names()
        .await
        .map_err(|e| format!("list_database_names failed: {e}"))?
        .into_iter()
        .filter(|n| !skip_dbs.contains(&n.as_str()))
        .collect();

    let mut tables: Vec<TableMeta> = Vec::new();

    for db_name in db_names {
        let db = client.database(&db_name);
        let coll_names = db
            .list_collection_names()
            .await
            .map_err(|e| format!("list_collection_names({db_name}) failed: {e}"))?;

        for coll_name in coll_names {
            // Use collStats to get document count and size
            let stats_result = db
                .run_command(doc! { "collStats": &coll_name })
                .await;

            let (row_count, size_bytes): (i64, i64) = match stats_result {
                Ok(stats) => {
                    let count = stats
                        .get("count")
                        .and_then(|v| v.as_i64())
                        .or_else(|| stats.get("count").and_then(|v| v.as_i32()).map(|n| n as i64))
                        .unwrap_or(0);
                    let size = stats
                        .get("size")
                        .and_then(|v| v.as_i64())
                        .or_else(|| stats.get("size").and_then(|v| v.as_i32()).map(|n| n as i64))
                        .unwrap_or(0);
                    (count, size)
                }
                Err(_) => (0, 0),
            };

            let size = format_bytes(size_bytes);

            tables.push(TableMeta {
                name: format!("{db_name}.{coll_name}"),
                row_count,
                size,
            });
        }
    }

    Ok(tables)
}

fn format_bytes(bytes: i64) -> String {
    if bytes < 1024 {
        format!("{bytes} B")
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

#[tauri::command]
pub async fn mg_get_collection_schema(
    state: tauri::State<'_, MongoState>,
    id: String,
    collection: String,
) -> Result<Vec<ColumnDef>, String> {
    let state = state.0.lock().await;
    let client = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let (db_name, coll_name) = parse_collection_ref(&collection);
    let coll = client.database(&db_name).collection::<Document>(&coll_name);

    // Sample up to 100 documents to infer schema
    let pipeline = vec![doc! { "$sample": { "size": 100 } }];
    let mut cursor = coll
        .aggregate(pipeline)
        .await
        .map_err(|e| format!("aggregate($sample) failed: {e}"))?;

    // field_name → bson_type (insertion-ordered)
    let mut field_types: indexmap::IndexMap<String, String> = indexmap::IndexMap::new();

    while let Some(doc) = cursor
        .try_next()
        .await
        .map_err(|e| format!("cursor error: {e}"))?
    {
        for (key, val) in &doc {
            field_types
                .entry(key.clone())
                .or_insert_with(|| bson_type_name(val).to_string());
        }
    }

    // _id is always first and always a PK
    let mut columns: Vec<ColumnDef> = Vec::new();

    if let Some(id_type) = field_types.shift_remove("_id") {
        columns.push(ColumnDef {
            name: "_id".to_string(),
            data_type: id_type,
            is_nullable: false,
            is_primary_key: true,
            foreign_key: None,
            default_value: None,
        });
    }

    for (name, data_type) in field_types {
        columns.push(ColumnDef {
            name,
            data_type,
            is_nullable: true,
            is_primary_key: false,
            foreign_key: None,
            default_value: None,
        });
    }

    Ok(columns)
}

#[tauri::command]
pub async fn mg_get_collection_data(
    state: tauri::State<'_, MongoState>,
    id: String,
    collection: String,
    limit: i64,
    offset: i64,
) -> Result<QueryResult, String> {
    let state = state.0.lock().await;
    let client = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let (db_name, coll_name) = parse_collection_ref(&collection);
    let coll = client.database(&db_name).collection::<Document>(&coll_name);

    let opts = FindOptions::builder()
        .skip(offset as u64)
        .limit(limit)
        .build();

    let start = Instant::now();
    let mut cursor = coll
        .find(doc! {})
        .with_options(opts)
        .await
        .map_err(|e| format!("find failed: {e}"))?;

    let mut docs: Vec<Document> = Vec::new();
    while let Some(doc) = cursor
        .try_next()
        .await
        .map_err(|e| format!("cursor error: {e}"))?
    {
        docs.push(doc);
    }
    let execution_time_ms = start.elapsed().as_millis();

    if docs.is_empty() {
        return Ok(QueryResult {
            columns: vec!["_id".to_string()],
            rows: vec![],
            row_count: 0,
            execution_time_ms,
        });
    }

    // Build column order: _id first, then union of all other fields
    let mut col_set: indexmap::IndexMap<String, ()> = indexmap::IndexMap::new();
    col_set.insert("_id".to_string(), ());
    for doc in &docs {
        for key in doc.keys() {
            if key != "_id" {
                col_set.insert(key.clone(), ());
            }
        }
    }
    let columns: Vec<String> = col_set.into_keys().collect();

    let rows: Vec<Vec<JsonValue>> = docs
        .iter()
        .map(|doc| {
            let flat: std::collections::HashMap<String, JsonValue> =
                flatten_doc(doc).into_iter().collect();
            columns
                .iter()
                .map(|col| flat.get(col).cloned().unwrap_or(JsonValue::Null))
                .collect()
        })
        .collect();

    let row_count = rows.len();

    Ok(QueryResult {
        columns,
        rows,
        row_count,
        execution_time_ms,
    })
}

#[tauri::command]
pub async fn mg_execute_query(
    state: tauri::State<'_, MongoState>,
    id: String,
    collection: String,
    filter_json: String,
    operation: String,
) -> Result<QueryResult, String> {
    let state = state.0.lock().await;
    let client = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let (db_name, coll_name) = parse_collection_ref(&collection);
    let coll = client.database(&db_name).collection::<Document>(&coll_name);

    // Parse the filter/pipeline JSON
    let filter_value: JsonValue = serde_json::from_str(&filter_json)
        .map_err(|e| format!("Invalid JSON: {e}"))?;

    let start = Instant::now();

    match operation.as_str() {
        "count" => {
            let filter_doc: Document = bson::to_document(
                &bson::from_slice::<bson::Bson>(
                    serde_json::to_vec(&filter_value)
                        .map_err(|e| e.to_string())?
                        .as_slice(),
                )
                .map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;

            let count = coll
                .count_documents(filter_doc)
                .await
                .map_err(|e| format!("count_documents failed: {e}"))?;

            Ok(QueryResult {
                columns: vec!["count".to_string()],
                rows: vec![vec![json!(count)]],
                row_count: 1,
                execution_time_ms: start.elapsed().as_millis(),
            })
        }

        "aggregate" => {
            let pipeline: Vec<Document> = match &filter_value {
                JsonValue::Array(stages) => stages
                    .iter()
                    .map(|s| {
                        bson::to_document(
                            &bson::from_slice::<bson::Bson>(
                                serde_json::to_vec(s).unwrap_or_default().as_slice(),
                            )
                            .unwrap_or(bson::Bson::Document(Document::new())),
                        )
                        .unwrap_or_default()
                    })
                    .collect(),
                _ => return Err("Aggregate expects a JSON array of pipeline stages".to_string()),
            };

            let mut cursor = coll
                .aggregate(pipeline)
                .await
                .map_err(|e| format!("aggregate failed: {e}"))?;

            let mut docs: Vec<Document> = Vec::new();
            while let Some(doc) = cursor
                .try_next()
                .await
                .map_err(|e| format!("cursor error: {e}"))?
            {
                docs.push(doc);
            }

            let execution_time_ms = start.elapsed().as_millis();
            build_query_result(docs, execution_time_ms)
        }

        // Default: find
        _ => {
            let filter_doc = json_to_bson_doc(&filter_value)?;
            let mut cursor = coll
                .find(filter_doc)
                .await
                .map_err(|e| format!("find failed: {e}"))?;

            let mut docs: Vec<Document> = Vec::new();
            while let Some(doc) = cursor
                .try_next()
                .await
                .map_err(|e| format!("cursor error: {e}"))?
            {
                docs.push(doc);
            }

            let execution_time_ms = start.elapsed().as_millis();
            build_query_result(docs, execution_time_ms)
        }
    }
}

fn json_to_bson_doc(value: &JsonValue) -> Result<Document, String> {
    let bson_val = bson::from_slice::<bson::Bson>(
        serde_json::to_vec(value)
            .map_err(|e| e.to_string())?
            .as_slice(),
    )
    .map_err(|e| format!("JSON→BSON conversion failed: {e}"))?;

    match bson_val {
        bson::Bson::Document(doc) => Ok(doc),
        _ => Ok(Document::new()),
    }
}

fn build_query_result(docs: Vec<Document>, execution_time_ms: u128) -> Result<QueryResult, String> {
    if docs.is_empty() {
        return Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            row_count: 0,
            execution_time_ms,
        });
    }

    let mut col_set: indexmap::IndexMap<String, ()> = indexmap::IndexMap::new();
    col_set.insert("_id".to_string(), ());
    for doc in &docs {
        for key in doc.keys() {
            if key != "_id" {
                col_set.insert(key.clone(), ());
            }
        }
    }
    let columns: Vec<String> = col_set.into_keys().collect();

    let rows: Vec<Vec<JsonValue>> = docs
        .iter()
        .map(|doc| {
            let flat: std::collections::HashMap<String, JsonValue> =
                flatten_doc(doc).into_iter().collect();
            columns
                .iter()
                .map(|col| flat.get(col).cloned().unwrap_or(JsonValue::Null))
                .collect()
        })
        .collect();

    let row_count = rows.len();

    Ok(QueryResult {
        columns,
        rows,
        row_count,
        execution_time_ms,
    })
}

#[tauri::command]
pub async fn mg_update_document(
    state: tauri::State<'_, MongoState>,
    id: String,
    collection: String,
    doc_id: String,
    updates_json: String,
) -> Result<(), String> {
    let state = state.0.lock().await;
    let client = state
        .get(&id)
        .ok_or_else(|| format!("No connection found for id: {id}"))?;

    let (db_name, coll_name) = parse_collection_ref(&collection);
    let coll = client.database(&db_name).collection::<Document>(&coll_name);

    // Try to parse _id as ObjectId first, fall back to string
    let id_bson = if let Ok(oid) = bson::oid::ObjectId::parse_str(&doc_id) {
        Bson::ObjectId(oid)
    } else {
        Bson::String(doc_id)
    };

    let updates_value: JsonValue = serde_json::from_str(&updates_json)
        .map_err(|e| format!("Invalid updates JSON: {e}"))?;

    let updates_doc = json_to_bson_doc(&updates_value)?;

    coll.update_one(
        doc! { "_id": id_bson },
        doc! { "$set": updates_doc },
    )
    .await
    .map_err(|e| format!("updateOne failed: {e}"))?;

    Ok(())
}
