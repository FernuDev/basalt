use std::collections::HashMap;
use tokio::sync::Mutex;

pub struct MongoState(pub Mutex<HashMap<String, mongodb::Client>>);
