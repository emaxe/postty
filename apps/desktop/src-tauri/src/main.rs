#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use postty_core::{HttpResponse, NativeHttpClient, RequestItem};

#[tauri::command]
async fn execute_native_http(
    request: RequestItem,
    variables: HashMap<String, String>,
) -> Result<HttpResponse, String> {
    let client = NativeHttpClient::new().map_err(|e| e.to_string())?;
    client
        .execute(&request, &variables)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_desktop_version() -> String {
    format!("Postty Desktop v{} (Tauri v2)", env!("CARGO_PKG_VERSION"))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            execute_native_http,
            get_desktop_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running Postty Desktop application");
}
