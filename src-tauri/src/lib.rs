mod commands;
mod db;
mod types;

use commands::{
    pg_connect, pg_describe_table, pg_disconnect, pg_execute_query, pg_get_foreign_keys,
    pg_get_table_data, pg_list_tables,
};
use db::DbState;
use std::collections::HashMap;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(DbState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            pg_connect,
            pg_disconnect,
            pg_list_tables,
            pg_describe_table,
            pg_get_table_data,
            pg_execute_query,
            pg_get_foreign_keys,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
