use serde_json::json;
use std::{
    env,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    time::{SystemTime, UNIX_EPOCH},
};

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn main() {
    let args = env::args().skip(1).collect::<Vec<_>>();
    let command = args.first().map(String::as_str).unwrap_or("serve");

    let result = match command {
        "self-check" => {
            println!(
                "{}",
                json!({
                    "name": "liplo-runtime",
                    "version": VERSION,
                    "placeholder": false,
                    "canStartWeb": true,
                    "canStartRealtime": true,
                    "requiresPnpm": false,
                    "requiresProjectSource": false,
                    "requiresUserNode": false
                })
            );
            Ok(())
        }
        "version" => {
            println!("liplo-runtime {VERSION}");
            Ok(())
        }
        "serve" => serve(&args[1..]),
        service @ ("web" | "realtime") => serve(&["--service".to_string(), service.to_string()]),
        _ => Err(format!("Unknown liplo-runtime command: {command}")),
    };

    if let Err(error) = result {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn serve(args: &[String]) -> Result<(), String> {
    let service = read_arg(args, "--service").unwrap_or_else(|| "all".to_string());
    let runtime_root = read_arg(args, "--runtime-root")
        .or_else(|| env::var("LIPLO_DESKTOP_RUNTIME_ROOT").ok())
        .map(PathBuf::from)
        .unwrap_or_else(default_runtime_root);
    let runtime_root = runtime_root
        .canonicalize()
        .map_err(|error| format!("Invalid runtime root {}: {error}", runtime_root.display()))?;

    let data_dir = read_arg(args, "--data-dir")
        .or_else(|| env::var("LIPLO_DESKTOP_DATA_DIR").ok())
        .map(PathBuf::from)
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("storage"));
    let data_dir = absolute_path(data_dir)?;

    let log_dir = read_arg(args, "--log-dir")
        .or_else(|| env::var("LIPLO_DESKTOP_LOG_DIR").ok())
        .map(PathBuf::from)
        .unwrap_or_else(|| data_dir.join("desktop").join("logs"));
    let log_dir = absolute_path(log_dir)?;

    fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&log_dir).map_err(|error| error.to_string())?;

    let node = node_path(&runtime_root);
    if !node.is_file() {
        return Err(format!(
            "Bundled Node runtime was not found at {}. Rebuild desktop runtime resources.",
            node.display()
        ));
    }

    let mut children = Vec::new();

    if service == "web" || service == "all" {
        children.push(start_web(&node, &runtime_root, &data_dir, &log_dir)?);
    }

    if service == "realtime" || service == "all" {
        children.push(start_realtime(&node, &runtime_root, &data_dir, &log_dir)?);
    }

    if children.is_empty() {
        return Err(format!("Unknown runtime service: {service}"));
    }

    let mut exit_code = 0;
    for child in children.iter_mut() {
        let status = child.wait().map_err(|error| error.to_string())?;
        if !status.success() {
            exit_code = status.code().unwrap_or(1);
        }
    }

    if exit_code == 0 {
        Ok(())
    } else {
        Err(format!("Runtime service exited with code {exit_code}"))
    }
}

fn start_web(node: &Path, runtime_root: &Path, data_dir: &Path, log_dir: &Path) -> Result<Child, String> {
    let web_root = runtime_root.join("web");
    let server = web_root.join("server.js");
    if !server.is_file() {
        return Err(format!("Web standalone server not found at {}", server.display()));
    }

    let log = log_file(log_dir, "web")?;
    append_log(&log, "starting web runtime");

    Command::new(node)
        .arg(server)
        .current_dir(&web_root)
        .envs(runtime_env(data_dir))
        .env("HOSTNAME", env::var("LIPLO_WEB_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()))
        .stdout(Stdio::from(log.try_clone().map_err(|error| error.to_string())?))
        .stderr(Stdio::from(log))
        .spawn()
        .map_err(|error| format!("Failed to start web runtime: {error}"))
}

fn start_realtime(node: &Path, runtime_root: &Path, data_dir: &Path, log_dir: &Path) -> Result<Child, String> {
    let realtime_root = runtime_root.join("realtime");
    let server = realtime_root.join("realtime-server.cjs");
    if !server.is_file() {
        return Err(format!("Realtime server not found at {}", server.display()));
    }

    let log = log_file(log_dir, "realtime")?;
    append_log(&log, "starting realtime runtime");

    let web_node_modules = runtime_root.join("web").join("node_modules");

    Command::new(node)
        .arg(server)
        .current_dir(&realtime_root)
        .envs(runtime_env(data_dir))
        .env("REALTIME_HOSTNAME", env::var("LIPLO_REALTIME_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()))
        .env("NODE_PATH", web_node_modules)
        .stdout(Stdio::from(log.try_clone().map_err(|error| error.to_string())?))
        .stderr(Stdio::from(log))
        .spawn()
        .map_err(|error| format!("Failed to start realtime runtime: {error}"))
}

fn runtime_env(data_dir: &Path) -> Vec<(String, String)> {
    let web_port = env::var("PORT").unwrap_or_else(|_| "7050".to_string());
    let realtime_port = env::var("REALTIME_PORT").unwrap_or_else(|_| "7051".to_string());
    let web_base = env::var("NEXT_PUBLIC_WIDGET_BASE_URL")
        .unwrap_or_else(|_| format!("http://127.0.0.1:{web_port}"));
    let socket_url = env::var("NEXT_PUBLIC_SOCKET_URL")
        .unwrap_or_else(|_| format!("http://127.0.0.1:{realtime_port}"));

    let mut values = vec![
        ("NODE_ENV".to_string(), "production".to_string()),
        ("LIPLO_APP_MODE".to_string(), "desktop".to_string()),
        ("LIPLO_DATA_MODE".to_string(), "cloud".to_string()),
        ("LIPLO_RUNTIME_MODE".to_string(), "desktop-cloud".to_string()),
        ("LIPLO_DESKTOP_DATA_DIR".to_string(), data_dir.display().to_string()),
        ("PORT".to_string(), web_port),
        ("REALTIME_PORT".to_string(), realtime_port),
        ("REALTIME_CONTROL_URL".to_string(), socket_url.clone()),
        ("NEXT_PUBLIC_WIDGET_BASE_URL".to_string(), web_base),
        ("NEXT_PUBLIC_SOCKET_URL".to_string(), socket_url),
    ];

    for key in [
        "DATABASE_URL",
        "LIPLO_CLOUD_BASE_URL",
        "TIKTOK_RECONNECT_MAX_ATTEMPTS",
        "TIKTOK_RECONNECT_MAX_DELAY_MS",
        "TIKTOK_CONNECTION_MODE",
        "TIKTOK_REQUEST_POLLING_INTERVAL_MS",
        "REALTIME_CONTROL_TOKEN",
    ] {
        if let Ok(value) = env::var(key) {
            values.push((key.to_string(), value));
        }
    }

    values
}

fn node_path(runtime_root: &Path) -> PathBuf {
    runtime_root
        .join("node")
        .join(if cfg!(windows) { "node.exe" } else { "node" })
}

fn default_runtime_root() -> PathBuf {
    env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .map(|path| path.join("resources").join("liplo-runtime"))
        .unwrap_or_else(|| PathBuf::from("src-tauri/resources/liplo-runtime"))
}

fn absolute_path(path: PathBuf) -> Result<PathBuf, String> {
    if path.is_absolute() {
        Ok(path)
    } else {
        env::current_dir()
            .map(|current_dir| current_dir.join(path))
            .map_err(|error| error.to_string())
    }
}

fn read_arg(args: &[String], name: &str) -> Option<String> {
    args.windows(2)
        .find(|pair| pair[0] == name)
        .map(|pair| pair[1].clone())
}

fn log_file(log_dir: &Path, service: &str) -> Result<std::fs::File, String> {
    fs::create_dir_all(log_dir).map_err(|error| error.to_string())?;
    let path = log_dir.join(format!("{service}.log"));
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| error.to_string())
}

fn append_log(file: &std::fs::File, message: &str) {
    if let Ok(mut file) = file.try_clone() {
        let _ = writeln!(file, "[{}] {message}", timestamp());
    }
}

fn timestamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
