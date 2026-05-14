// File + terminal logger for Xhare.
//
// One log file per day at:
//   macOS:   ~/Library/Application Support/com.felipe.xhare/logs/xhare-YYYY-MM-DD.log
//   Windows: %APPDATA%\com.felipe.xhare\logs\xhare-YYYY-MM-DD.log
//
// In-app viewer reads the tail of the current log file via `read_log_lines`.

use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::thread;
use std::time::{Duration, SystemTime};

use chrono::Local;
use serde::Serialize;
use simplelog::{
    ColorChoice, CombinedLogger, Config, ConfigBuilder, LevelFilter, TermLogger, TerminalMode,
    WriteLogger,
};

const APP_DIR: &str = "com.felipe.xhare";
const LOGS_SUBDIR: &str = "logs";
const MAX_LOG_AGE: Duration = Duration::from_secs(2 * 24 * 60 * 60); // 2 days
const CLEANUP_INTERVAL: Duration = Duration::from_secs(6 * 60 * 60); // 6 hours

fn logs_dir() -> Option<PathBuf> {
    Some(dirs::config_dir()?.join(APP_DIR).join(LOGS_SUBDIR))
}

fn current_log_path() -> Option<PathBuf> {
    let dir = logs_dir()?;
    fs::create_dir_all(&dir).ok()?;
    Some(dir.join(format!("xhare-{}.log", Local::now().format("%Y-%m-%d"))))
}

pub fn init() {
    let Some(log_path) = current_log_path() else {
        eprintln!("logger: no config dir, falling back to stderr only");
        let _ = TermLogger::init(
            LevelFilter::Info,
            Config::default(),
            TerminalMode::Mixed,
            ColorChoice::Auto,
        );
        return;
    };

    let file = match OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("logger: failed to open {}: {e}", log_path.display());
            let _ = TermLogger::init(
                LevelFilter::Info,
                Config::default(),
                TerminalMode::Mixed,
                ColorChoice::Auto,
            );
            return;
        }
    };

    let config = ConfigBuilder::new()
        .set_time_format_rfc3339()
        .set_time_offset_to_local()
        .map(|c| c.build())
        .unwrap_or_else(|c| c.build());

    let _ = CombinedLogger::init(vec![
        TermLogger::new(
            LevelFilter::Info,
            config.clone(),
            TerminalMode::Mixed,
            ColorChoice::Auto,
        ),
        WriteLogger::new(LevelFilter::Info, config, file),
    ]);

    log::info!("logger initialized; writing to {}", log_path.display());

    cleanup_old_logs();
    spawn_cleanup_thread();
}

/// Delete log files older than `MAX_LOG_AGE`. Quiet on errors — best effort.
fn cleanup_old_logs() {
    let Some(dir) = logs_dir() else { return };
    let Ok(entries) = fs::read_dir(&dir) else { return };
    let now = SystemTime::now();
    let mut removed: u32 = 0;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("log") {
            continue;
        }
        let Ok(metadata) = entry.metadata() else { continue };
        let Ok(modified) = metadata.modified() else { continue };
        let Ok(age) = now.duration_since(modified) else { continue };
        if age > MAX_LOG_AGE {
            if fs::remove_file(&path).is_ok() {
                removed += 1;
            } else {
                log::warn!("failed to remove old log file: {}", path.display());
            }
        }
    }
    if removed > 0 {
        log::info!("cleaned up {removed} log file(s) older than 2 days");
    }
}

fn spawn_cleanup_thread() {
    thread::spawn(|| loop {
        thread::sleep(CLEANUP_INTERVAL);
        cleanup_old_logs();
    });
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogLine {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

/// Read up to `limit` most-recent lines from the current log file.
#[tauri::command]
pub fn read_log_lines(limit: usize) -> Vec<LogLine> {
    let Some(path) = current_log_path() else {
        return Vec::new();
    };
    let Ok(file) = OpenOptions::new().read(true).open(&path) else {
        return Vec::new();
    };
    let reader = BufReader::new(file);
    let mut lines: Vec<String> = Vec::with_capacity(1024);
    for line in reader.lines().map_while(Result::ok) {
        lines.push(line);
    }
    let start = lines.len().saturating_sub(limit);
    lines[start..]
        .iter()
        .filter_map(|line| parse_line(line))
        .collect()
}

#[tauri::command]
pub fn get_logs_dir() -> String {
    logs_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// simplelog default format is: `[LEVEL TS module] message` or similar. We
/// parse loosely — if a line doesn't match, we surface the raw text as INFO.
fn parse_line(line: &str) -> Option<LogLine> {
    if line.trim().is_empty() {
        return None;
    }
    // Format from simplelog with TimeFormat::Custom looks like:
    //   "2026-05-14T15:23:45-03:00 [INFO ] xhare_lib::transfer: message here"
    // Split on the first space (timestamp), then look for "[LEVEL"
    if let Some((ts, rest)) = line.split_once(' ') {
        if let Some(open_b) = rest.find('[') {
            if let Some(close_b) = rest[open_b..].find(']') {
                let level = rest[open_b + 1..open_b + close_b].trim().to_string();
                let after = rest[open_b + close_b + 1..].trim_start();
                let message = after
                    .split_once(": ")
                    .map(|(_, m)| m.to_string())
                    .unwrap_or_else(|| after.to_string());
                return Some(LogLine {
                    timestamp: ts.to_string(),
                    level,
                    message,
                });
            }
        }
    }
    Some(LogLine {
        timestamp: String::new(),
        level: "INFO".to_string(),
        message: line.to_string(),
    })
}
