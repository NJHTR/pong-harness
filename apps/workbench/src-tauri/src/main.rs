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

fn validate_project_name(name: &str) -> Result<&str, String> {
    let clean_name = name.trim();
    let reserved_stem = clean_name
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    let reserved_windows_name = matches!(reserved_stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ["COM", "LPT"].iter().any(|prefix| {
            reserved_stem.strip_prefix(prefix).is_some_and(|suffix| {
                matches!(suffix, "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9")
            })
        });
    if clean_name.is_empty()
        || clean_name == "."
        || clean_name == ".."
        || clean_name.ends_with([' ', '.'])
        || clean_name.contains(['\\', '/', ':'])
        || clean_name
            .chars()
            .any(|character| character.is_control() || "<>\"|?*".contains(character))
        || reserved_windows_name
    {
        return Err("Enter a valid project name that can be used as a folder name".to_string());
    }
    Ok(clean_name)
}

fn create_project_directory_at(parent: PathBuf, name: &str) -> Result<String, String> {
    let clean_name = validate_project_name(name)?;
    if !parent.is_absolute() {
        return Err("The selected parent folder must be an absolute path".to_string());
    }
    if !parent.is_dir() {
        return Err("The selected parent folder does not exist".to_string());
    }
    let parent = fs::canonicalize(parent)
        .map_err(|error| format!("Unable to resolve parent folder: {error}"))?;
    let project = parent.join(clean_name);
    fs::create_dir(&project)
        .map_err(|error| format!("Unable to create project folder: {error}"))?;
    fs::canonicalize(project)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|error| format!("Unable to resolve new project folder: {error}"))
}

#[tauri::command]
fn create_project_directory(
    app: tauri::AppHandle,
    parent_path: String,
    name: String,
) -> Result<String, String> {
    let parent = if parent_path.trim().is_empty() {
        let home_parent = app
            .path()
            .home_dir()
            .map_err(|error| format!("Unable to locate the user home folder: {error}"))?
            .join("SeekwdProjects");
        fs::create_dir_all(&home_parent).map_err(|error| {
            format!(
                "Unable to create the default projects folder at {}: {error}",
                home_parent.display()
            )
        })?;
        home_parent
    } else {
        PathBuf::from(parent_path.trim())
    };
    create_project_directory_at(parent, &name)
}

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
        .invoke_handler(tauri::generate_handler![create_project_directory])
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_names_must_be_single_valid_folder_names() {
        for invalid in [
            "",
            ".",
            "..",
            "../outside",
            "one\\two",
            "name.",
            "bad:name",
            "CON",
        ] {
            assert!(
                validate_project_name(invalid).is_err(),
                "{invalid:?} should be rejected"
            );
        }
        assert_eq!(validate_project_name("  backend  ").unwrap(), "backend");
    }

    #[test]
    fn project_directory_creation_does_not_overwrite_existing_folders() {
        let parent = std::env::temp_dir().join(format!("seekwd-project-{}", Uuid::new_v4()));
        fs::create_dir_all(&parent).unwrap();

        let created = create_project_directory_at(parent.clone(), "New Project").unwrap();
        let created_path = PathBuf::from(created);
        assert!(created_path.is_dir());
        assert!(create_project_directory_at(parent.clone(), "New Project").is_err());

        fs::remove_dir_all(parent).unwrap();
    }
}
