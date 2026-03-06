use std::collections::HashMap;
use tokio::sync::Mutex;

pub struct DbState(pub Mutex<HashMap<String, sqlx::PgPool>>);
