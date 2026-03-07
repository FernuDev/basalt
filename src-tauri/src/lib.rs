mod commands;
mod db;
mod mongo;
mod mongo_commands;
mod types;

use commands::{
    pg_connect, pg_describe_table, pg_disconnect, pg_execute_query, pg_get_foreign_keys,
    pg_get_table_data, pg_list_tables,
};
use db::DbState;
use mongo::MongoState;
use mongo_commands::{
    mg_connect, mg_disconnect, mg_execute_query, mg_get_collection_data, mg_get_collection_schema,
    mg_list_collections, mg_update_document,
};
use std::collections::HashMap;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState(Mutex::new(HashMap::new())))
        .manage(MongoState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            // PostgreSQL
            pg_connect,
            pg_disconnect,
            pg_list_tables,
            pg_describe_table,
            pg_get_table_data,
            pg_execute_query,
            pg_get_foreign_keys,
            // MongoDB
            mg_connect,
            mg_disconnect,
            mg_list_collections,
            mg_get_collection_schema,
            mg_get_collection_data,
            mg_execute_query,
            mg_update_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
