// TCP transfer protocol for Xhare.
//
// Wire format (all integers big-endian):
//
//   ┌──────────────────────┬──────────────────────────────┐
//   │ u32  header length   │ header bytes (JSON, UTF-8)   │
//   └──────────────────────┴──────────────────────────────┘
//   ┌──────────────────────┬──────────┬───────────────────┐
//   │ u32  chunk length    │ u32 crc32│ chunk bytes       │   ← repeats
//   └──────────────────────┴──────────┴───────────────────┘
//   ┌─────────────────┐
//   │ u32 length = 0  │ ← sentinel meaning "end of file"
//   └─────────────────┘
//
// Header schema:
//   { "fileId": "<uuid>", "name": "foo.pdf", "size": 12345, "from": "device-name" }
//
// The receiver writes chunks into a cache file and emits Tauri events as
// bytes flow. Failure modes (bad CRC, short read, etc.) emit `transfer-error`
// and tear down the connection.

use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read, Write};
use std::net::{IpAddr, SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::thread;
use std::time::Duration;

use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime};

use crate::discovery;

pub const TRANSFER_PORT: u16 = 9876;
pub const CHUNK_SIZE: usize = 256 * 1024;

const APP_DIR: &str = "Xhare";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileHeader {
    file_id: String,
    name: String,
    size: u64,
    from: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceivedFile {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub from: String,
    pub cached_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    id: String,
    direction: &'static str, // "send" | "receive"
    bytes: u64,
    total: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompletePayload {
    id: String,
    direction: &'static str,
    peer: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorPayload {
    id: String,
    direction: &'static str,
    peer: Option<String>,
    message: String,
}

// ─── public surface ───────────────────────────────────────────────────────

pub fn cache_dir() -> Option<PathBuf> {
    Some(dirs::cache_dir()?.join(APP_DIR))
}

/// Boot the TCP listener. Each accepted connection is handled on its own
/// thread so concurrent sends from multiple peers don't block each other.
pub fn setup<R: Runtime>(app: &tauri::App<R>) {
    let handle = app.handle().clone();
    thread::spawn(move || {
        if let Err(e) = run_server(handle) {
            log::error!("transfer server crashed: {e}");
        }
    });
}

fn run_server<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let listener = TcpListener::bind(SocketAddr::new(
        IpAddr::V4(std::net::Ipv4Addr::UNSPECIFIED),
        TRANSFER_PORT,
    ))
    .map_err(|e| format!("bind 0.0.0.0:{TRANSFER_PORT}: {e}"))?;
    log::info!("transfer server listening on 0.0.0.0:{TRANSFER_PORT}");
    for incoming in listener.incoming() {
        match incoming {
            Ok(stream) => {
                let app = app.clone();
                thread::spawn(move || {
                    if let Err(e) = handle_incoming(&app, stream) {
                        log::error!("transfer recv error: {e}");
                    }
                });
            }
            Err(e) => log::warn!("accept failed: {e}"),
        }
    }
    Ok(())
}

fn handle_incoming<R: Runtime>(app: &AppHandle<R>, stream: TcpStream) -> Result<(), String> {
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .ok();
    let mut reader = BufReader::new(stream);

    let header_len = reader.read_u32::<BigEndian>().map_err(|e| e.to_string())?;
    if header_len == 0 || header_len > 64 * 1024 {
        return Err(format!("invalid header length {header_len}"));
    }
    let mut header_bytes = vec![0u8; header_len as usize];
    reader.read_exact(&mut header_bytes).map_err(|e| e.to_string())?;
    let header: FileHeader =
        serde_json::from_slice(&header_bytes).map_err(|e| format!("parse header: {e}"))?;

    let dir = cache_dir().ok_or_else(|| "no cache dir".to_string())?;
    let file_dir = dir.join(&header.file_id);
    fs::create_dir_all(&file_dir).map_err(|e| format!("create cache dir: {e}"))?;
    let path = file_dir.join(&header.name);
    let file = File::create(&path).map_err(|e| format!("create cache file: {e}"))?;
    let mut writer = BufWriter::new(file);

    let id = header.file_id.clone();
    let mut received: u64 = 0;
    loop {
        let chunk_len = match reader.read_u32::<BigEndian>() {
            Ok(v) => v,
            Err(e) => {
                let _ = app.emit(
                    "transfer-error",
                    ErrorPayload {
                        id: id.clone(),
                        direction: "receive",
                        peer: Some(header.from.clone()),
                        message: format!("read chunk len: {e}"),
                    },
                );
                return Err(e.to_string());
            }
        };
        if chunk_len == 0 {
            break;
        }
        if chunk_len as usize > CHUNK_SIZE * 2 {
            return Err(format!("oversized chunk {chunk_len}"));
        }
        let expected_crc = reader.read_u32::<BigEndian>().map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; chunk_len as usize];
        reader.read_exact(&mut buf).map_err(|e| e.to_string())?;
        let actual_crc = crc32fast::hash(&buf);
        if actual_crc != expected_crc {
            let _ = app.emit(
                "transfer-error",
                ErrorPayload {
                    id: id.clone(),
                    direction: "receive",
                    peer: Some(header.from.clone()),
                    message: format!("crc mismatch (got {actual_crc:08x}, want {expected_crc:08x})"),
                },
            );
            return Err("crc mismatch".to_string());
        }
        writer.write_all(&buf).map_err(|e| e.to_string())?;
        received = received.saturating_add(chunk_len as u64);
        let _ = app.emit(
            "transfer-progress",
            ProgressPayload {
                id: id.clone(),
                direction: "receive",
                bytes: received,
                total: header.size,
            },
        );
    }
    writer.flush().map_err(|e| e.to_string())?;

    let _ = app.emit(
        "file-received",
        ReceivedFile {
            id: header.file_id.clone(),
            name: header.name.clone(),
            size: header.size,
            from: header.from.clone(),
            cached_path: path.to_string_lossy().to_string(),
        },
    );
    let _ = app.emit(
        "transfer-complete",
        CompletePayload {
            id: header.file_id,
            direction: "receive",
            peer: Some(header.from),
        },
    );
    Ok(())
}

// ─── outgoing ─────────────────────────────────────────────────────────────

#[tauri::command]
pub fn send_file<R: Runtime>(
    app: AppHandle<R>,
    source_path: String,
    peers: Vec<String>,
) -> Result<SentFile, String> {
    let path = PathBuf::from(&source_path);
    if !path.is_file() {
        return Err(format!("not a file: {source_path}"));
    }
    let metadata = fs::metadata(&path).map_err(|e| format!("stat: {e}"))?;
    let size = metadata.len();
    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("file")
        .to_string();
    let file_id = uuid::Uuid::new_v4().to_string();
    let from = discovery::own_device_name();
    let header = FileHeader {
        file_id: file_id.clone(),
        name: name.clone(),
        size,
        from: from.clone(),
    };

    for peer in &peers {
        let app = app.clone();
        let header = header.clone();
        let path = path.clone();
        let peer = peer.clone();
        thread::spawn(move || {
            if let Err(e) = send_to_peer(&app, &path, &header, &peer) {
                log::warn!("send to {peer} failed: {e}");
                let _ = app.emit(
                    "transfer-error",
                    ErrorPayload {
                        id: header.file_id,
                        direction: "send",
                        peer: Some(peer),
                        message: e,
                    },
                );
            }
        });
    }

    Ok(SentFile {
        id: file_id,
        name,
        size,
        from,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SentFile {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub from: String,
}

fn send_to_peer<R: Runtime>(
    app: &AppHandle<R>,
    path: &PathBuf,
    header: &FileHeader,
    peer_address: &str,
) -> Result<(), String> {
    let socket = format!("{peer_address}:{TRANSFER_PORT}");
    log::info!("transfer: connecting to {socket} for file {}", header.name);
    let stream =
        TcpStream::connect_timeout(&socket.parse().map_err(|e| format!("addr: {e}"))?, Duration::from_secs(5))
            .map_err(|e| format!("connect {socket}: {e}"))?;
    log::info!("transfer: connected to {socket}");
    stream.set_write_timeout(Some(Duration::from_secs(30))).ok();
    let mut writer = BufWriter::new(stream);

    let header_bytes = serde_json::to_vec(header).map_err(|e| format!("encode header: {e}"))?;
    writer
        .write_u32::<BigEndian>(header_bytes.len() as u32)
        .map_err(|e| e.to_string())?;
    writer.write_all(&header_bytes).map_err(|e| e.to_string())?;

    let file = File::open(path).map_err(|e| format!("open source: {e}"))?;
    let mut reader = BufReader::new(file);
    let mut buf = vec![0u8; CHUNK_SIZE];
    let mut sent: u64 = 0;
    loop {
        let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        let chunk = &buf[..n];
        let crc = crc32fast::hash(chunk);
        writer
            .write_u32::<BigEndian>(n as u32)
            .map_err(|e| e.to_string())?;
        writer
            .write_u32::<BigEndian>(crc)
            .map_err(|e| e.to_string())?;
        writer.write_all(chunk).map_err(|e| e.to_string())?;
        sent = sent.saturating_add(n as u64);
        let _ = app.emit(
            "transfer-progress",
            ProgressPayload {
                id: header.file_id.clone(),
                direction: "send",
                bytes: sent,
                total: header.size,
            },
        );
    }
    // End-of-file sentinel
    writer.write_u32::<BigEndian>(0).map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;

    let _ = app.emit(
        "transfer-complete",
        CompletePayload {
            id: header.file_id.clone(),
            direction: "send",
            peer: Some(peer_address.to_string()),
        },
    );
    Ok(())
}

// ─── cache commands ───────────────────────────────────────────────────────

#[tauri::command]
pub fn save_cached_file(
    file_id: String,
    name: String,
    destination_dir: String,
) -> Result<String, String> {
    let cache = cache_dir().ok_or_else(|| "no cache dir".to_string())?;
    let src = cache.join(&file_id).join(&name);
    if !src.is_file() {
        return Err(format!("cache file missing: {}", src.display()));
    }
    let dest_dir = PathBuf::from(destination_dir);
    fs::create_dir_all(&dest_dir).map_err(|e| format!("create dest dir: {e}"))?;
    let dest = dest_dir.join(&name);
    fs::copy(&src, &dest).map_err(|e| format!("copy: {e}"))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub fn discard_cached_file(file_id: String) -> Result<(), String> {
    let cache = cache_dir().ok_or_else(|| "no cache dir".to_string())?;
    let dir = cache.join(&file_id);
    if dir.is_dir() {
        fs::remove_dir_all(&dir).map_err(|e| format!("remove: {e}"))?;
    }
    Ok(())
}

/// Open an arbitrary absolute path in the user's default app.
#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(format!("path not found: {path}"));
    }
    spawn_open(p)
}

/// Reveal a file in the system file manager (Finder on macOS, Explorer on
/// Windows). On macOS we use `open -R` so the file is highlighted; on Windows
/// `explorer /select,<path>` does the same. Falls back to opening the parent
/// directory if those flags aren't available.
#[tauri::command]
pub fn reveal_path(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(format!("path not found: {path}"));
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(p)
            .spawn()
            .map_err(|e| format!("open -R: {e}"))?;
        return Ok(());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| format!("explorer /select: {e}"))?;
        return Ok(());
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let parent = p.parent().ok_or_else(|| "no parent dir".to_string())?;
        spawn_open(parent)
    }
}

fn spawn_open(path: &std::path::Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("open: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("explorer: {e}"))?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("xdg-open: {e}"))?;
    }
    Ok(())
}
