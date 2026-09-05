use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum HttpMethod {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE,
    HEAD,
    OPTIONS,
}

impl Default for HttpMethod {
    fn default() -> Self {
        Self::GET
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValueParam {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AuthConfig {
    None,
    Bearer { token: String },
    Basic { username: String, password: String },
    ApiKey { key: String, value: String, add_to: String },
    Inherit,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self::Inherit
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum RequestBody {
    None,
    Raw { raw: String, language: String },
    Urlencoded { urlencoded: Vec<KeyValueParam> },
}

impl Default for RequestBody {
    fn default() -> Self {
        Self::None
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestItem {
    #[serde(default = "Uuid::new_v4")]
    pub id: Uuid,
    pub collection_id: Uuid,
    pub folder_id: Option<Uuid>,
    pub name: String,
    #[serde(default)]
    pub method: HttpMethod,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub headers: Vec<KeyValueParam>,
    #[serde(default)]
    pub query_params: Vec<KeyValueParam>,
    #[serde(default)]
    pub body: RequestBody,
    #[serde(default)]
    pub auth: AuthConfig,
    #[serde(default)]
    pub pre_request_script: String,
    #[serde(default)]
    pub test_script: String,
    #[serde(default)]
    pub order_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status_code: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub content_type: Option<String>,
    pub size_bytes: usize,
    pub total_duration_ms: u64,
    pub timestamp: i64,
}
