// Persistent user settings.
//
// Settings live in a JSON file at the OS-appropriate config dir:
//   macOS:   ~/Library/Application Support/com.felipe.xhare/settings.json
//   Windows: %APPDATA%\com.felipe.xhare\settings.json
//   Linux:   ~/.config/com.felipe.xhare/settings.json
//
// On load: if the file doesn't exist or fails to parse, we return defaults
// without crashing the app. On save: we write atomically (write-then-rename)
// so a crash mid-write can't leave a corrupted file.

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

const APP_DIR: &str = "com.felipe.xhare";
const FILE_NAME: &str = "settings.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub download_folder: String,
    pub cache_ttl: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            download_folder: default_download_folder(),
            cache_ttl: "24h".to_string(),
        }
    }
}

fn default_download_folder() -> String {
    dirs::download_dir()
        .map(|p| p.join("Xhare").to_string_lossy().to_string())
        .unwrap_or_else(|| {
            dirs::home_dir()
                .map(|p| p.join("Downloads").join("Xhare").to_string_lossy().to_string())
                .unwrap_or_default()
        })
}

fn settings_dir() -> Option<PathBuf> {
    Some(dirs::config_dir()?.join(APP_DIR))
}

fn settings_path() -> Option<PathBuf> {
    Some(settings_dir()?.join(FILE_NAME))
}

#[tauri::command]
pub fn load_settings() -> Settings {
    let Some(path) = settings_path() else {
        return Settings::default();
    };
    let Ok(bytes) = fs::read(&path) else {
        return Settings::default();
    };
    serde_json::from_slice::<Settings>(&bytes).unwrap_or_default()
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    let dir = settings_dir().ok_or_else(|| "no config dir".to_string())?;
    fs::create_dir_all(&dir).map_err(|e| format!("create_dir_all: {e}"))?;

    let final_path = dir.join(FILE_NAME);
    let tmp_path = dir.join(format!("{FILE_NAME}.tmp"));

    let bytes = serde_json::to_vec_pretty(&settings).map_err(|e| format!("serialize: {e}"))?;
    fs::write(&tmp_path, &bytes).map_err(|e| format!("write tmp: {e}"))?;
    fs::rename(&tmp_path, &final_path).map_err(|e| format!("rename: {e}"))?;
    Ok(())
}
