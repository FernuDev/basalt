#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub uri: String,
}

#[derive(Debug, serde::Serialize)]
pub struct TableMeta {
    pub name: String,
    pub row_count: i64,
    pub size: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ColumnDef {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
    pub foreign_key: Option<String>,
    pub default_value: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub execution_time_ms: u128,
}

#[derive(Debug, serde::Serialize)]
pub struct ForeignKey {
    pub from_table: String,
    pub from_column: String,
    pub to_table: String,
    pub to_column: String,
}
