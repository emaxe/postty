use std::fs;
use std::path::PathBuf;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub email: String,
    pub name: String,
    pub token: String,
    pub api_url: String,
}

pub fn get_auth_file_path() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".postty").join("auth.json")
}

pub fn load_session() -> Option<AuthSession> {
    let path = get_auth_file_path();
    if !path.exists() {
        return None;
    }
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

pub fn save_session(session: &AuthSession) -> Result<()> {
    let path = get_auth_file_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(session)?;
    fs::write(path, json)?;
    Ok(())
}

pub fn clear_session() -> Result<()> {
    let path = get_auth_file_path();
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

#[derive(Deserialize)]
struct LoginResponse {
    token: String,
    user: UserInfo,
}

#[derive(Deserialize)]
struct UserInfo {
    email: String,
    name: String,
}

pub async fn login_request(email: &str, password: &str, api_url: &str) -> Result<AuthSession> {
    let url = format!("{}/api/v1/auth/login", api_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    
    let resp = client
        .post(&url)
        .json(&serde_json::json!({
            "email": email,
            "password": password,
        }))
        .send()
        .await
        .context("Failed to connect to authentication server")?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        anyhow::bail!("Authentication failed: {}", err_text);
    }

    let parsed: LoginResponse = resp.json().await.context("Invalid login response from server")?;
    let session = AuthSession {
        email: parsed.user.email,
        name: parsed.user.name,
        token: parsed.token,
        api_url: api_url.to_string(),
    };

    save_session(&session)?;
    Ok(session)
}
