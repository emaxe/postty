use std::collections::HashMap;
use regex::Regex;
use uuid::Uuid;

pub struct VariableInterpolator;

impl VariableInterpolator {
    pub fn interpolate(text: &str, vars: &HashMap<String, String>) -> String {
        let re = Regex::new(r"\{\{([a-zA-Z0-9_$.-]+)\}\}").unwrap();
        let mut result = text.to_string();

        for _ in 0..5 {
            if !re.is_match(&result) {
                break;
            }

            result = re.replace_all(&result, |caps: &regex::Captures| {
                let key = &caps[1];
                match key {
                    "$guid" | "$uuid" => Uuid::new_v4().to_string(),
                    "$timestamp" => chrono::Utc::now().timestamp().to_string(),
                    "$isoTimestamp" => chrono::Utc::now().to_rfc3339(),
                    _ => vars.get(key).cloned().unwrap_or_else(|| caps[0].to_string()),
                }
            }).to_string();
        }

        result
    }
}
