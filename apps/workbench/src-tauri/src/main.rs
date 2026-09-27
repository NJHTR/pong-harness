#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    env, fs, io,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
};

use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;

const HOST_URL: &str = "http://127.0.0.1:4317";

struct HostProcess(Mutex<Option<Child>>);

fn host_token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn host_binary(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    if let Some(path) = env::var_os("PONG_HOST_BIN") {
        return Ok(PathBuf::from(path));
    }
    let file_name = if cfg!(windows) {
        "pong-host.exe"
    } else {
        "pong-host"
    };
    let executable_dir = env::current_exe()?
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| io::Error::other("Seekwd executable has no parent directory"))?;
    let development_binary = executable_dir.join(file_name);
    if development_binary.exists() {
        return Ok(development_binary);
    }
    app.path()
        .resource_dir()
        .map(|path| path.join(file_name))
        .map_err(|error| io::Error::other(error.to_string()))
}

fn spawn_host(app: &tauri::AppHandle, token: &str) -> io::Result<Child> {
    let data_dir = if app.config().identifier == "com.seekwd.workbench.dev" {
        env::current_exe()?
            .parent()
            .map(PathBuf::from)
            .ok_or_else(|| io::Error::other("Seekwd executable has no parent directory"))?
            .join("data")
    } else {
        app.path()
            .app_data_dir()
            .map_err(|error| io::Error::other(error.to_string()))?
    };
    fs::create_dir_all(&data_dir)?;
    let database = data_dir.join("pong-host.sqlite3");
    let binary = host_binary(app)?;
    if !binary.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("pong-host binary was not found at {}", binary.display()),
        ));
    }
    let mut command = Command::new(binary);
    command
        .env("PONG_HOST_TOKEN", token)
        .env("PONG_HOST_ALLOWED_ORIGIN", "http://tauri.localhost")
        .env("PONG_HOST_DB", database)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    command.spawn()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let token = host_token();
            let child = spawn_host(&app.handle(), &token)
                .map_err(|error| Box::new(error) as Box<dyn std::error::Error>)?;
            app.manage(HostProcess(Mutex::new(Some(child))));

            let script = format!(
                "window.__SEEKWD_HOST__ = {{baseUrl: '{}', token: '{}'}};",
                HOST_URL, token
            );
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Seekwd")
                .decorations(false)
                .transparent(false)
                .inner_size(1440.0, 920.0)
                .min_inner_size(1024.0, 680.0)
                .initialization_script(&script)
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Seekwd application")
        .run(|app, event| {
            if matches!(event, RunEvent::Exit) {
                if let Some(process) = app.try_state::<HostProcess>() {
                    if let Ok(mut child) = process.0.lock() {
                        if let Some(child) = child.as_mut() {
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }
                }
            }
        });
}
