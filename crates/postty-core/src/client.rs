use std::collections::HashMap;
use std::time::Instant;
use crate::models::{HttpResponse, RequestItem, RequestBody, AuthConfig};
use crate::interpolator::VariableInterpolator;
use anyhow::{Context, Result};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};

pub struct NativeHttpClient {
    client: reqwest::Client,
}

impl NativeHttpClient {
    pub fn new() -> Result<Self> {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(false)
            .build()
            .context("Failed to build HTTP client")?;
        Ok(Self { client })
    }

    pub async fn execute(
        &self,
        request: &RequestItem,
        variables: &HashMap<String, String>,
    ) -> Result<HttpResponse> {
        let start = Instant::now();

        // 1. URL с переменными
        let mut final_url = VariableInterpolator::interpolate(&request.url, variables);

        // Query params
        if !request.query_params.is_empty() {
            let mut url_parsed = url::Url::parse(&final_url).context("Invalid URL format")?;
            for q in &request.query_params {
                if q.enabled && !q.key.is_empty() {
                    let k = VariableInterpolator::interpolate(&q.key, variables);
                    let v = VariableInterpolator::interpolate(&q.value, variables);
                    url_parsed.query_pairs_mut().append_pair(&k, &v);
                }
            }
            final_url = url_parsed.to_string();
        }

        // 2. Метод
        let method = match request.method {
            crate::models::HttpMethod::GET => reqwest::Method::GET,
            crate::models::HttpMethod::POST => reqwest::Method::POST,
            crate::models::HttpMethod::PUT => reqwest::Method::PUT,
            crate::models::HttpMethod::PATCH => reqwest::Method::PATCH,
            crate::models::HttpMethod::DELETE => reqwest::Method::DELETE,
            crate::models::HttpMethod::HEAD => reqwest::Method::HEAD,
            crate::models::HttpMethod::OPTIONS => reqwest::Method::OPTIONS,
        };

        let mut req_builder = self.client.request(method, &final_url);

        // 3. Заголовки
        let mut headers = HeaderMap::new();
        for h in &request.headers {
            if h.enabled && !h.key.is_empty() {
                let k = VariableInterpolator::interpolate(&h.key, variables);
                let v = VariableInterpolator::interpolate(&h.value, variables);
                if let (Ok(name), Ok(val)) = (
                    HeaderName::from_bytes(k.as_bytes()),
                    HeaderValue::from_str(&v),
                ) {
                    headers.insert(name, val);
                }
            }
        }

        // 4. Авторизация
        match &request.auth {
            AuthConfig::Bearer { token } => {
                let t = VariableInterpolator::interpolate(token, variables);
                req_builder = req_builder.bearer_auth(t);
            }
            AuthConfig::Basic { username, password } => {
                let u = VariableInterpolator::interpolate(username, variables);
                let p = VariableInterpolator::interpolate(password, variables);
                req_builder = req_builder.basic_auth(u, Some(p));
            }
            _ => {}
        }

        // 5. Тело запроса
        match &request.body {
            RequestBody::Raw { raw, language } => {
                let body_str = VariableInterpolator::interpolate(raw, variables);
                if language == "json" && !headers.contains_key(reqwest::header::CONTENT_TYPE) {
                    headers.insert(
                        reqwest::header::CONTENT_TYPE,
                        HeaderValue::from_static("application/json"),
                    );
                }
                req_builder = req_builder.body(body_str);
            }
            _ => {}
        }

        req_builder = req_builder.headers(headers);

        let resp = req_builder.send().await?;
        let status_code = resp.status().as_u16();
        let status_text = resp.status().canonical_reason().unwrap_or("").to_string();

        let mut resp_headers = HashMap::new();
        for (k, v) in resp.headers() {
            if let Ok(v_str) = v.to_str() {
                resp_headers.insert(k.as_str().to_string(), v_str.to_string());
            }
        }
        let content_type = resp_headers.get("content-type").cloned();

        let body = resp.text().await?;
        let size_bytes = body.len();
        let total_duration_ms = start.elapsed().as_millis() as u64;

        Ok(HttpResponse {
            status_code,
            status_text,
            headers: resp_headers,
            body,
            content_type,
            size_bytes,
            total_duration_ms,
            timestamp: chrono::Utc::now().timestamp_millis(),
        })
    }
}
