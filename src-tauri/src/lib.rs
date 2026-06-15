use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    sync::Mutex,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

const DEFAULT_WEB_PORT: u16 = 7050;
const DEFAULT_REALTIME_PORT: u16 = 7051;

struct RunningSidecar {
    child: CommandChild,
    service: String,
    pid: u32,
    port: u16,
    started_at: String,
    log_path: PathBuf,
}

#[derive(Default)]
struct SidecarState {
    children: Mutex<HashMap<String, RunningSidecar>>,
    statuses: Mutex<HashMap<String, Value>>,
}

#[tauri::command]
fn liplo_read_config() -> Result<Value, String> {
    read_or_create_config()
}

#[tauri::command]
fn liplo_write_config(config: Value) -> Result<(), String> {
    write_config(normalize_config(config))
}

#[tauri::command]
fn liplo_start_sidecar(
    app: AppHandle,
    service: String,
    state: State<SidecarState>,
) -> Result<Value, String> {
    start_sidecar_service(&app, &state, &service)
}

#[tauri::command]
fn liplo_stop_sidecar(service: String, state: State<SidecarState>) -> Result<Value, String> {
    stop_sidecar_service(&state, &service)
}

#[tauri::command]
fn start_sidecars(app: AppHandle, state: State<SidecarState>) -> Result<Value, String> {
    let web = start_sidecar_service(&app, &state, "web")?;
    let realtime = start_sidecar_service(&app, &state, "realtime")?;
    Ok(json!({ "web": web, "realtime": realtime }))
}

#[tauri::command]
fn stop_sidecars(state: State<SidecarState>) -> Result<Value, String> {
    let services = {
        let children = state
            .children
            .lock()
            .map_err(|_| "Failed to lock sidecar state.".to_string())?;
        children.keys().cloned().collect::<Vec<_>>()
    };

    let mut stopped = Vec::new();
    for service in services {
        stopped.push(stop_sidecar_service(&state, &service)?);
    }

    Ok(json!({ "stopped": stopped }))
}

#[tauri::command]
fn restart_sidecars(app: AppHandle, state: State<SidecarState>) -> Result<Value, String> {
    let _ = stop_sidecars(state.clone());
    start_sidecars(app, state)
}

#[tauri::command]
fn get_sidecar_status(state: State<SidecarState>) -> Result<Value, String> {
    let mut statuses = state
        .statuses
        .lock()
        .map_err(|_| "Failed to lock sidecar status.".to_string())?
        .clone();

    let children = state
        .children
        .lock()
        .map_err(|_| "Failed to lock sidecar state.".to_string())?;

    for (service, running) in children.iter() {
        statuses.insert(
            service.clone(),
            json!({
                "service": running.service,
                "running": true,
                "reachable": service_reachable(service),
                "pid": running.pid,
                "port": running.port,
                "lastError": null,
                "startedAt": running.started_at,
                "logPath": running.log_path,
            }),
        );
    }

    Ok(json!(statuses))
}

#[tauri::command]
fn liplo_web_health() -> Value {
    check_web_health()
}

#[tauri::command]
fn liplo_realtime_health() -> Value {
    check_realtime_health()
}

#[tauri::command]
fn check_web_health() -> Value {
    let config = read_or_create_config().unwrap_or_else(|_| default_config());
    let url = format!(
        "{}/api/health",
        string_at(&config, &["web", "baseUrl"], "http://127.0.0.1:7050")
    );
    check_http_health(&url)
}

#[tauri::command]
fn check_realtime_health() -> Value {
    let config = read_or_create_config().unwrap_or_else(|_| default_config());
    let socket_url = string_at(&config, &["realtime", "socketUrl"], "http://127.0.0.1:7051");
    let url = format!("{}/health", socket_url.trim_end_matches('/'));
    check_http_health(&url)
}

#[tauri::command]
fn check_desktop_health(state: State<SidecarState>) -> Result<Value, String> {
    Ok(json!({
        "web": check_web_health(),
        "realtime": check_realtime_health(),
        "sidecars": get_sidecar_status(state)?,
    }))
}

#[tauri::command]
fn connect_obs_websocket() -> Value {
    obs_bridge_placeholder("connect OBS websocket")
}

#[tauri::command]
fn disconnect_obs_websocket() -> Value {
    obs_bridge_placeholder("disconnect OBS websocket")
}

#[tauri::command]
fn test_obs_websocket_connection() -> Value {
    obs_bridge_placeholder("test OBS websocket connection")
}

#[tauri::command]
fn get_obs_status() -> Value {
    obs_bridge_placeholder("get OBS status")
}

#[tauri::command]
fn set_obs_browser_source_url() -> Value {
    obs_bridge_placeholder("set OBS browser source URL")
}

#[tauri::command]
fn set_obs_scene_item_transform() -> Value {
    obs_bridge_placeholder("set OBS scene item transform")
}

#[tauri::command]
fn liplo_connect_obs() -> Value {
    connect_obs_websocket()
}

#[tauri::command]
fn liplo_disconnect_obs() -> Value {
    disconnect_obs_websocket()
}

#[tauri::command]
fn liplo_set_obs_browser_source() -> Value {
    set_obs_browser_source_url()
}

#[tauri::command]
fn toggle_overlay() -> Value {
    json!({
        "ok": true,
        "message": "Toggle overlay hotkey received. Overlay action remains handled by the web runtime."
    })
}

fn start_sidecar_service(
    app: &AppHandle,
    state: &SidecarState,
    service: &str,
) -> Result<Value, String> {
    if service != "web" && service != "realtime" {
        return Err(format!("Unknown sidecar service: {service}"));
    }

    {
        let children = state
            .children
            .lock()
            .map_err(|_| "Failed to lock sidecar state.".to_string())?;
        if let Some(running) = children.get(service) {
            return Ok(json!({
                "service": service,
                "running": true,
                "reused": true,
                "pid": running.pid,
                "port": running.port,
                "startedAt": running.started_at,
                "logPath": running.log_path,
            }));
        }
    }

    let config = read_or_create_config()?;
    let port = service_port(&config, service);
    let health_url = service_health_url(&config, service);

    if check_http_health_bool(&health_url) {
        let status = json!({
            "service": service,
            "running": true,
            "reused": true,
            "pid": null,
            "port": port,
            "reachable": true,
            "startedAt": null,
            "lastError": null,
        });
        remember_status(state, service, status.clone());
        return Ok(status);
    }

    if tcp_port_open(port) {
        let message = format!(
            "Port {port} is already in use by a non-Liplo process. Close that process or change the desktop config port."
        );
        let status = json!({
            "service": service,
            "running": false,
            "reused": false,
            "pid": null,
            "port": port,
            "reachable": false,
            "startedAt": null,
            "lastError": message,
        });
        remember_status(state, service, status);
        return Err(message);
    }

    let logs_dir = desktop_storage_dir().join("logs");
    fs::create_dir_all(&logs_dir).map_err(|error| error.to_string())?;
    let log_path = logs_dir.join(format!("{service}.log"));
    append_log_line(
        &log_path,
        &format!("Starting {service} sidecar at {}", timestamp()),
    );

    let data_dir = desktop_storage_dir_for_app(app);
    let config_path = data_dir.join("config.json");
    let runtime_root = desktop_runtime_root(app);
    let is_development = cfg!(debug_assertions) || std::env::var("LIPLO_DESKTOP_DEV_FALLBACK").is_ok();

    let command = if is_development {
        dev_fallback_command(app, service)
    } else {
        app.shell()
            .sidecar("liplo-runtime")
            .map_err(|error| format!("Failed to resolve bundled liplo-runtime sidecar: {error}"))?
            .args([
                "serve",
                "--service",
                service,
                "--config",
                &config_path.display().to_string(),
                "--data-dir",
                &data_dir.display().to_string(),
                "--log-dir",
                &logs_dir.display().to_string(),
                "--runtime-root",
                &runtime_root.display().to_string(),
            ])
    };

    let (mut rx, child) = command
        .envs(runtime_env(&config))
        .spawn()
        .map_err(|error| format!("Failed to spawn {service} sidecar: {error}"))?;

    let pid = child.pid();
    let started_at = timestamp();
    let log_path_for_task = log_path.clone();
    let service_for_task = service.to_string();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    append_log_line(&log_path_for_task, &String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Stderr(bytes) => {
                    append_log_line(&log_path_for_task, &String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Error(error) => {
                    append_log_line(
                        &log_path_for_task,
                        &format!("{service_for_task} error: {error}"),
                    );
                }
                CommandEvent::Terminated(payload) => {
                    #[cfg(unix)]
                    let termination = format!(
                        "{service_for_task} terminated with code {:?} signal {:?}",
                        payload.code, payload.signal
                    );
                    #[cfg(not(unix))]
                    let termination =
                        format!("{service_for_task} terminated with code {:?}", payload.code);
                    append_log_line(&log_path_for_task, &termination);
                    break;
                }
                _ => {}
            }
        }
    });

    let running = RunningSidecar {
        child,
        service: service.to_string(),
        pid,
        port,
        started_at: started_at.clone(),
        log_path: log_path.clone(),
    };

    {
        let mut children = state
            .children
            .lock()
            .map_err(|_| "Failed to lock sidecar state.".to_string())?;
        children.insert(service.to_string(), running);
    }

    let status = json!({
        "service": service,
        "running": true,
        "reused": false,
        "pid": pid,
        "port": port,
        "reachable": false,
        "startedAt": started_at,
        "lastError": null,
        "logPath": log_path,
        "mode": if is_development { "development" } else { "packaged" },
        "usingBundledSidecar": !is_development,
        "usingPnpmFallback": is_development,
    });
    remember_status(state, service, status.clone());
    Ok(status)
}

fn stop_sidecar_service(state: &SidecarState, service: &str) -> Result<Value, String> {
    let running = {
        let mut children = state
            .children
            .lock()
            .map_err(|_| "Failed to lock sidecar state.".to_string())?;
        children.remove(service)
    };

    if let Some(running) = running {
        let pid = running.pid;
        let port = running.port;
        let log_path = running.log_path.clone();
        running
            .child
            .kill()
            .map_err(|error| format!("Failed to stop {service} sidecar: {error}"))?;
        append_log_line(
            &log_path,
            &format!("Stopped {service} sidecar at {}", timestamp()),
        );

        let status = json!({
            "service": service,
            "running": false,
            "pid": pid,
            "port": port,
            "reachable": false,
            "lastError": null,
            "stoppedAt": timestamp(),
            "logPath": log_path,
        });
        remember_status(state, service, status.clone());
        return Ok(status);
    }

    Ok(json!({
        "service": service,
        "running": false,
        "reused": false,
        "pid": null,
        "lastError": null,
    }))
}

fn stop_owned_sidecars(state: &SidecarState) {
    let services = match state.children.lock() {
        Ok(children) => children.keys().cloned().collect::<Vec<_>>(),
        Err(_) => return,
    };

    for service in services {
        let _ = stop_sidecar_service(state, &service);
    }
}

fn dev_fallback_command(app: &AppHandle, service: &str) -> tauri_plugin_shell::process::Command {
    let script = match service {
        "realtime" => "dev:realtime",
        _ => "dev",
    };
    app.shell()
        .command("pnpm")
        .args(["run", script])
        .current_dir(project_root())
}

fn runtime_env(config: &Value) -> Vec<(String, String)> {
    let web_base = string_at(config, &["web", "baseUrl"], "http://127.0.0.1:7050");
    let realtime_url = string_at(config, &["realtime", "socketUrl"], "http://127.0.0.1:7051");
    let realtime_port = service_port(config, "realtime");
    let web_port = service_port(config, "web");

    let mut envs = vec![
        ("NODE_ENV".to_string(), "production".to_string()),
        (
            "NODE_OPTIONS".to_string(),
            "--no-experimental-webstorage".to_string(),
        ),
        ("NEXT_TELEMETRY_DISABLED".to_string(), "1".to_string()),
        ("LIPLO_APP_MODE".to_string(), "desktop".to_string()),
        ("LIPLO_DATA_MODE".to_string(), "cloud".to_string()),
        (
            "LIPLO_RUNTIME_MODE".to_string(),
            "desktop-cloud".to_string(),
        ),
        (
            "LIPLO_CLOUD_BASE_URL".to_string(),
            string_at(config, &["cloud", "baseUrl"], ""),
        ),
        ("PORT".to_string(), web_port.to_string()),
        ("REALTIME_PORT".to_string(), realtime_port.to_string()),
        ("REALTIME_CONTROL_URL".to_string(), realtime_url.clone()),
        ("NEXT_PUBLIC_WIDGET_BASE_URL".to_string(), web_base),
        ("NEXT_PUBLIC_SOCKET_URL".to_string(), realtime_url),
    ];

    // Internal desktop builds can receive DB/API secrets from the launcher
    // environment, but packaged releases must not bake these into resources.
    for key in ["DATABASE_URL"] {
        if let Some(value) = env_or_dotenv(key) {
            envs.push((key.to_string(), value));
        }
    }

    envs
}

fn env_or_dotenv(key: &str) -> Option<String> {
    std::env::var(key)
        .ok()
        .or_else(|| read_dotenv_value(key))
}

fn read_dotenv_value(key: &str) -> Option<String> {
    dotenv_candidates()
        .into_iter()
        .find_map(|path| read_dotenv_value_from(&path, key))
}

fn dotenv_candidates() -> Vec<PathBuf> {
    let mut bases = Vec::new();

    if let Ok(path) = std::env::current_exe() {
        if let Some(parent) = path.parent() {
            bases.push(parent.to_path_buf());
        }
    }

    if let Ok(path) = std::env::current_dir() {
        bases.push(path);
    }

    let mut candidates = Vec::new();
    for base in bases {
        for ancestor in base.ancestors() {
            candidates.push(ancestor.join(".env"));
        }
    }

    candidates
}

fn read_dotenv_value_from(path: &Path, key: &str) -> Option<String> {
    let raw = fs::read_to_string(path).ok()?;

    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let (name, value) = line.split_once('=')?;
        if name.trim() == key {
            return Some(unquote_env_value(value.trim()));
        }
    }

    None
}

fn unquote_env_value(value: &str) -> String {
    value
        .strip_prefix('"')
        .and_then(|value| value.strip_suffix('"'))
        .or_else(|| value.strip_prefix('\'').and_then(|value| value.strip_suffix('\'')))
        .unwrap_or(value)
        .to_string()
}

fn check_http_health(url: &str) -> Value {
    let start = Instant::now();
    let result = http_get_ok(url);
    json!({
        "reachable": result.is_ok(),
        "url": url,
        "latencyMs": start.elapsed().as_millis(),
        "error": result.err(),
        "timestamp": timestamp(),
    })
}

fn check_http_health_bool(url: &str) -> bool {
    http_get_ok(url).is_ok()
}

fn http_get_ok(url: &str) -> Result<(), String> {
    let (host, port, path) = parse_http_url(url)?;
    let addr = format!("{host}:{port}")
        .parse::<SocketAddr>()
        .map_err(|error| error.to_string())?;
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(700))
        .map_err(|error| error.to_string())?;
    stream
        .set_read_timeout(Some(Duration::from_millis(700)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_millis(700)))
        .map_err(|error| error.to_string())?;
    let request = format!("GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n");
    stream
        .write_all(request.as_bytes())
        .map_err(|error| error.to_string())?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| error.to_string())?;
    if response.starts_with("HTTP/1.1 2") || response.starts_with("HTTP/1.0 2") {
        Ok(())
    } else {
        Err(response
            .lines()
            .next()
            .unwrap_or("No HTTP response")
            .to_string())
    }
}

fn parse_http_url(url: &str) -> Result<(String, u16, String), String> {
    let without_scheme = url
        .strip_prefix("http://")
        .ok_or_else(|| format!("Only http:// health URLs are supported locally: {url}"))?;
    let (host_port, path) = match without_scheme.split_once('/') {
        Some((host_port, path)) => (host_port, format!("/{path}")),
        None => (without_scheme, "/".to_string()),
    };
    let (host, port) = match host_port.rsplit_once(':') {
        Some((host, port)) => (
            host.to_string(),
            port.parse::<u16>().map_err(|error| error.to_string())?,
        ),
        None => (host_port.to_string(), 80),
    };
    Ok((host, port, path))
}

fn tcp_port_open(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok()
}

fn service_port(config: &Value, service: &str) -> u16 {
    let path = if service == "realtime" {
        ["realtime", "port"]
    } else {
        ["web", "port"]
    };
    number_at(
        config,
        &path,
        if service == "realtime" {
            DEFAULT_REALTIME_PORT
        } else {
            DEFAULT_WEB_PORT
        },
    )
}

fn service_health_url(config: &Value, service: &str) -> String {
    if service == "realtime" {
        let url = string_at(config, &["realtime", "socketUrl"], "http://127.0.0.1:7051");
        format!("{}/health", url.trim_end_matches('/'))
    } else {
        let url = string_at(config, &["web", "baseUrl"], "http://127.0.0.1:7050");
        format!("{}/api/health", url.trim_end_matches('/'))
    }
}

fn service_reachable(service: &str) -> bool {
    let config = read_or_create_config().unwrap_or_else(|_| default_config());
    check_http_health_bool(&service_health_url(&config, service))
}

fn remember_status(state: &SidecarState, service: &str, status: Value) {
    if let Ok(mut statuses) = state.statuses.lock() {
        statuses.insert(service.to_string(), status);
    }
}

fn read_or_create_config() -> Result<Value, String> {
    let path = desktop_config_path();
    match fs::read_to_string(&path) {
        Ok(raw) => {
            let parsed = serde_json::from_str::<Value>(&raw).map_err(|error| error.to_string())?;
            let normalized = normalize_config(parsed);
            write_config(normalized.clone())?;
            Ok(normalized)
        }
        Err(_) => {
            let config = default_config();
            write_config(config.clone())?;
            Ok(config)
        }
    }
}

fn write_config(config: Value) -> Result<(), String> {
    let path = desktop_config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(
        path,
        serde_json::to_string_pretty(&normalize_config(config))
            .map_err(|error| error.to_string())?
            + "\n",
    )
    .map_err(|error| error.to_string())
}

fn normalize_config(value: Value) -> Value {
    let fallback = default_config();

    let web_port = valid_port(
        value
            .pointer("/web/port")
            .and_then(Value::as_u64)
            .or_else(|| value.get("webPort").and_then(Value::as_u64)),
        DEFAULT_WEB_PORT,
    );
    let realtime_port = valid_port(
        value
            .pointer("/realtime/port")
            .and_then(Value::as_u64)
            .or_else(|| value.get("realtimePort").and_then(Value::as_u64)),
        DEFAULT_REALTIME_PORT,
    );
    let web_base = valid_http_url(
        value
            .pointer("/web/baseUrl")
            .and_then(Value::as_str)
            .or_else(|| value.get("webBaseUrl").and_then(Value::as_str)),
        &format!("http://127.0.0.1:{web_port}"),
    );
    let realtime_url = valid_http_url(
        value
            .pointer("/realtime/socketUrl")
            .and_then(Value::as_str)
            .or_else(|| value.get("realtimeSocketUrl").and_then(Value::as_str)),
        &format!("http://127.0.0.1:{realtime_port}"),
    );
    let overlay_base = valid_http_url(
        value
            .pointer("/overlay/baseUrl")
            .and_then(Value::as_str)
            .or_else(|| value.get("overlayBaseUrl").and_then(Value::as_str)),
        &web_base,
    );
    let obs_url = valid_ws_url(
        value
            .pointer("/obs/websocketUrl")
            .and_then(Value::as_str)
            .or_else(|| value.pointer("/obs/url").and_then(Value::as_str)),
        "ws://127.0.0.1:4455",
    );

    json!({
        "version": 1,
        "web": {
            "host": string_at(&value, &["web", "host"], "127.0.0.1"),
            "port": web_port,
            "baseUrl": web_base
        },
        "realtime": {
            "host": string_at(&value, &["realtime", "host"], "127.0.0.1"),
            "port": realtime_port,
            "socketUrl": realtime_url,
            "path": string_at(&value, &["realtime", "path"], "/socket.io"),
            "autoConnect": value.pointer("/realtime/autoConnect").and_then(Value::as_bool).unwrap_or(true)
        },
        "obs": {
            "websocketUrl": obs_url,
            "password": value.pointer("/obs/password").and_then(Value::as_str).unwrap_or("").to_string(),
            "autoConnect": value.pointer("/obs/autoConnect").and_then(Value::as_bool).unwrap_or(false),
            "defaultSceneName": string_at(&value, &["obs", "defaultSceneName"], ""),
            "defaultBrowserSourceName": string_at(&value, &["obs", "defaultBrowserSourceName"], "Liplo Overlay")
        },
        "overlay": {
            "baseUrl": overlay_base,
            "autoUpdateObsBrowserSource": value.pointer("/overlay/autoUpdateObsBrowserSource").and_then(Value::as_bool).unwrap_or(true)
        },
        "hotkeys": value.get("hotkeys").cloned().unwrap_or_else(|| fallback["hotkeys"].clone()),
        "cloud": {
            "baseUrl": string_at(&value, &["cloud", "baseUrl"], "")
        },
        "sqlite": {
            "path": string_at(&value, &["sqlite", "path"], "storage/desktop/liplo.sqlite")
        }
    })
}

fn default_config() -> Value {
    json!({
        "version": 1,
        "web": {
            "host": "127.0.0.1",
            "port": DEFAULT_WEB_PORT,
            "baseUrl": "http://127.0.0.1:7050"
        },
        "realtime": {
            "host": "127.0.0.1",
            "port": DEFAULT_REALTIME_PORT,
            "socketUrl": "http://127.0.0.1:7051",
            "path": "/socket.io",
            "autoConnect": true
        },
        "obs": {
            "websocketUrl": "ws://127.0.0.1:4455",
            "password": "",
            "autoConnect": false,
            "defaultSceneName": "",
            "defaultBrowserSourceName": "Liplo Overlay"
        },
        "overlay": {
            "baseUrl": "http://127.0.0.1:7050",
            "autoUpdateObsBrowserSource": true
        },
        "hotkeys": [
            {
                "id": "toggle-overlay",
                "label": "Toggle Overlay",
                "accelerator": "CommandOrControl+Shift+O",
                "enabled": true,
                "action": {
                    "type": "desktop-command",
                    "command": "toggle_overlay"
                }
            }
        ],
        "cloud": {
            "baseUrl": ""
        },
        "sqlite": {
            "path": "storage/desktop/liplo.sqlite"
        }
    })
}

fn valid_port(value: Option<u64>, fallback: u16) -> u16 {
    value
        .and_then(|port| u16::try_from(port).ok())
        .filter(|port| *port > 0)
        .unwrap_or(fallback)
}

fn valid_http_url(value: Option<&str>, fallback: &str) -> String {
    let value = value.unwrap_or("").trim();
    if value.starts_with("http://") || value.starts_with("https://") {
        value.to_string()
    } else {
        fallback.to_string()
    }
}

fn valid_ws_url(value: Option<&str>, fallback: &str) -> String {
    let value = value.unwrap_or("").trim();
    if value.starts_with("ws://") || value.starts_with("wss://") {
        value.to_string()
    } else {
        fallback.to_string()
    }
}

fn number_at(value: &Value, path: &[&str; 2], fallback: u16) -> u16 {
    value
        .get(path[0])
        .and_then(|node| node.get(path[1]))
        .and_then(Value::as_u64)
        .and_then(|port| u16::try_from(port).ok())
        .filter(|port| *port > 0)
        .unwrap_or(fallback)
}

fn string_at(value: &Value, path: &[&str; 2], fallback: &str) -> String {
    value
        .get(path[0])
        .and_then(|node| node.get(path[1]))
        .and_then(Value::as_str)
        .filter(|text| !text.trim().is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn desktop_config_path() -> PathBuf {
    desktop_storage_dir().join("config.json")
}

fn desktop_storage_dir() -> PathBuf {
    if let Ok(path) = std::env::var("LIPLO_DESKTOP_DATA_DIR") {
        return PathBuf::from(path).join("storage").join("desktop");
    }

    project_root().join("storage").join("desktop")
}

fn desktop_storage_dir_for_app(app: &AppHandle) -> PathBuf {
    if cfg!(debug_assertions) || std::env::var("LIPLO_DESKTOP_DEV_FALLBACK").is_ok() {
        return desktop_storage_dir();
    }

    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| project_root().join("storage").join("desktop"))
        .join("storage")
        .join("desktop")
}

fn project_root() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn desktop_runtime_root(app: &AppHandle) -> PathBuf {
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| project_root().join("src-tauri").join("resources"));
    let direct = resource_dir.join("liplo-runtime");
    if direct.exists() {
        return direct;
    }

    let nested = resource_dir.join("resources").join("liplo-runtime");
    if nested.exists() {
        return nested;
    }

    direct
}

fn append_log_line(path: &PathBuf, line: &str) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{line}");
    }
}

fn timestamp() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    millis.to_string()
}

fn obs_bridge_placeholder(action: &str) -> Value {
    json!({
        "ok": true,
        "action": action,
        "message": "OBS websocket commands are exposed through the desktop JavaScript adapter; Rust does not log or own the OBS password."
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(SidecarState::default())
        .setup(|app| {
            if !cfg!(debug_assertions) && std::env::var("LIPLO_DESKTOP_DEV_FALLBACK").is_err() {
                if let Ok(data_dir) = app.path().app_data_dir() {
                    std::env::set_var("LIPLO_DESKTOP_DATA_DIR", data_dir);
                }
            }

            app.global_shortcut().on_shortcut(
                "CommandOrControl+Shift+O",
                |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let _ = app.emit(
                            "liplo://hotkey",
                            json!({
                                "id": "toggle-overlay",
                                "command": "toggle_overlay",
                            }),
                        );
                    }
                },
            )?;

            if !cfg!(debug_assertions) && std::env::var("LIPLO_DESKTOP_DEV_FALLBACK").is_err() {
                let app_handle = app.handle().clone();
                let state = app.state::<SidecarState>();
                let _ = start_sidecar_service(&app_handle, state.inner(), "web");
                let _ = start_sidecar_service(&app_handle, state.inner(), "realtime");
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                if let Some(state) = window.try_state::<SidecarState>() {
                    stop_owned_sidecars(state.inner());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            liplo_read_config,
            liplo_write_config,
            liplo_start_sidecar,
            liplo_stop_sidecar,
            start_sidecars,
            stop_sidecars,
            restart_sidecars,
            get_sidecar_status,
            liplo_web_health,
            liplo_realtime_health,
            check_web_health,
            check_realtime_health,
            check_desktop_health,
            connect_obs_websocket,
            disconnect_obs_websocket,
            test_obs_websocket_connection,
            get_obs_status,
            set_obs_browser_source_url,
            set_obs_scene_item_transform,
            liplo_connect_obs,
            liplo_disconnect_obs,
            liplo_set_obs_browser_source,
            toggle_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running Liplo desktop app");
}
