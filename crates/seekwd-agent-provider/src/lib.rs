use std::time::Duration;

pub const KEYRING_SERVICE: &str = "com.seekwd.workbench.agent";
pub const KEYRING_USER: &str = "default";
const MAX_PROMPT_CHARS: usize = 200_000;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(90);

pub struct AgentRequest<'a> {
    pub endpoint: &'a str,
    pub model: &'a str,
    pub prompt: &'a str,
    pub workspace_name: &'a str,
    pub environment: &'a str,
    pub instructions: &'a str,
    pub context: Option<&'a str>,
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|error| format!("Unable to access the Windows Credential Manager: {error}"))
}

pub fn validate_endpoint(endpoint: &str) -> Result<String, String> {
    let value = endpoint.trim().trim_end_matches('/').to_string();
    if value.contains(char::is_whitespace) {
        return Err("Agent endpoint cannot contain whitespace".to_string());
    }
    let parsed = reqwest::Url::parse(&value)
        .map_err(|error| format!("Agent endpoint is not a valid URL: {error}"))?;
    if !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err(
            "Agent endpoint cannot contain credentials, a query string, or a fragment".to_string(),
        );
    }
    let secure = parsed.scheme() == "https";
    let local_http = parsed.scheme() == "http"
        && parsed
            .host_str()
            .is_some_and(|host| matches!(host, "localhost" | "127.0.0.1" | "::1"));
    if !secure && !local_http {
        return Err(
            "Agent endpoints must use HTTPS. HTTP is allowed only for localhost.".to_string(),
        );
    }
    Ok(value)
}

pub fn has_api_key() -> Result<bool, String> {
    match keyring_entry()?.get_password() {
        Ok(value) => Ok(!value.trim().is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(format!("Unable to read the Agent API key: {error}")),
    }
}

pub fn save_api_key(api_key: &str) -> Result<(), String> {
    let entry = keyring_entry()?;
    if api_key.trim().is_empty() {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!("Unable to remove the Agent API key: {error}")),
        }
    } else {
        entry
            .set_password(api_key.trim())
            .map_err(|error| format!("Unable to save the Agent API key: {error}"))
    }
}

fn load_api_key() -> Result<String, String> {
    let api_key = keyring_entry()?
        .get_password()
        .map_err(|error| format!("Configure an Agent API key first: {error}"))?;
    if api_key.trim().is_empty() {
        Err("Configure an Agent API key first".to_string())
    } else {
        Ok(api_key)
    }
}

pub async fn test_openai_compatible(endpoint: &str, model: &str) -> Result<String, String> {
    let endpoint = validate_endpoint(endpoint)?;
    let model = model.trim();
    if model.is_empty() {
        return Err("Agent model is required".to_string());
    }
    let api_key = load_api_key()?;
    let response = http_client()?
        .post(format!("{endpoint}/chat/completions"))
        .bearer_auth(&api_key)
        .json(&serde_json::json!({
            "model": model,
            "messages": [{ "role": "user", "content": "Reply with the single word OK." }],
            "max_tokens": 4,
            "temperature": 0
        }))
        .send()
        .await
        .map_err(|error| format!("Unable to reach the Agent endpoint: {error}"))?;
    ensure_success(response, &api_key).await?;
    Ok("Agent connection verified".to_string())
}

pub async fn run_openai_compatible(request: AgentRequest<'_>) -> Result<String, String> {
    let endpoint = validate_endpoint(request.endpoint)?;
    let model = request.model.trim();
    let prompt = request.prompt.trim();
    if model.is_empty() || prompt.is_empty() {
        return Err("Agent model and prompt are required".to_string());
    }
    let context = request.context.unwrap_or_default().trim();
    if prompt.chars().count() + context.chars().count() > MAX_PROMPT_CHARS {
        return Err(format!(
            "Agent prompt and context exceed the {MAX_PROMPT_CHARS} character limit"
        ));
    }
    let api_key = load_api_key()?;
    let extra_instructions = request.instructions.trim();
    let system = format!(
        "You are the configured Seekwd Agent for workspace '{}'. \
         The selected execution environment is '{}'. \
         Use only the context explicitly supplied by Seekwd. \
         Do not claim that files, commands, graph nodes, or external systems were changed unless a later capability result explicitly confirms it. \
         {}",
        request.workspace_name, request.environment, extra_instructions
    );
    let user = if context.is_empty() {
        prompt.to_string()
    } else {
        format!("Goal:\n{prompt}\n\nSeekwd-provided context:\n{context}")
    };
    let response = http_client()?
        .post(format!("{endpoint}/chat/completions"))
        .bearer_auth(&api_key)
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user }
            ]
        }))
        .send()
        .await
        .map_err(|error| format!("Unable to reach the Agent endpoint: {error}"))?;
    let body = ensure_success(response, &api_key).await?;
    let payload: serde_json::Value = serde_json::from_str(&body)
        .map_err(|error| format!("Agent returned invalid JSON: {error}"))?;
    payload
        .pointer("/choices/0/message/content")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Agent response did not contain choices[0].message.content".to_string())
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|error| format!("Unable to configure the Agent HTTP client: {error}"))
}

async fn ensure_success(response: reqwest::Response, api_key: &str) -> Result<String, String> {
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Unable to read the Agent response: {error}"))?;
    if status.is_success() {
        Ok(body)
    } else {
        Err(format!(
            "Agent endpoint returned {status}: {}",
            sanitize_error_body(&body, api_key)
        ))
    }
}

pub fn sanitize_error_body(body: &str, api_key: &str) -> String {
    let normalized = body
        .trim()
        .replace(['\r', '\n'], " ")
        .replace(api_key, "[redacted]");
    if normalized.chars().count() > 320 {
        format!("{}…", normalized.chars().take(320).collect::<String>())
    } else {
        normalized
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn endpoint_requires_secure_transport_except_loopback() {
        assert!(validate_endpoint("https://api.example.com/v1").is_ok());
        assert!(validate_endpoint("http://127.0.0.1:8080/v1").is_ok());
        assert!(validate_endpoint("http://api.example.com/v1").is_err());
        assert!(validate_endpoint("ftp://api.example.com/v1").is_err());
        assert!(validate_endpoint("https://user:pass@api.example.com/v1").is_err());
        assert!(validate_endpoint("https://api.example.com/v1?debug=true").is_err());
    }

    #[test]
    fn error_body_redacts_and_truncates_secrets() {
        let body = format!("token={} {}", "secret-key", "x".repeat(400));
        let sanitized = sanitize_error_body(&body, "secret-key");
        assert!(!sanitized.contains("secret-key"));
        assert!(sanitized.contains("[redacted]"));
        assert!(sanitized.chars().count() <= 321);
    }
}
