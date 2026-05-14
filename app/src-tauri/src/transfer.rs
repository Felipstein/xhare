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
    pub from_address: Option<String>,
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ZipStartPayload {
    id: String,
    name: String,
    total: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ZipProgressPayload {
    id: String,
    bytes: u64,
    total: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ZipCompletePayload {
    id: String,
    name: String,
    size: u64,
}

// ─── public surface ───────────────────────────────────────────────────────

pub fn cache_dir() -> Option<PathBuf> {
    Some(dirs::cache_dir()?.join(APP_DIR))
}

/// Wipe everything under the cache dir. Called on app exit so received files
/// don't accumulate forever — the cache is meant to be transient, the user's
/// real copy lives wherever they chose to "Salvar". Best-effort: errors are
/// logged, never surfaced, since this runs while the app is tearing down.
pub fn clear_cache() {
    let Some(dir) = cache_dir() else { return };
    if !dir.is_dir() {
        return;
    }
    match fs::read_dir(&dir) {
        Ok(entries) => {
            let mut removed: u32 = 0;
            for entry in entries.flatten() {
                let path = entry.path();
                let result = if path.is_dir() {
                    fs::remove_dir_all(&path)
                } else {
                    fs::remove_file(&path)
                };
                match result {
                    Ok(_) => removed += 1,
                    Err(e) => log::warn!("cache cleanup: failed to remove {}: {e}", path.display()),
                }
            }
            if removed > 0 {
                log::info!("cache cleared: removed {removed} entr(y/ies) from {}", dir.display());
            }
        }
        Err(e) => log::warn!("cache cleanup: read_dir failed for {}: {e}", dir.display()),
    }
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

/// `Ok(None)` = connection closed before sending anything (heartbeat probe).
/// `Ok(Some(()))` = real transfer completed.
/// `Err(...)` = real protocol error mid-transfer.
fn handle_incoming<R: Runtime>(
    app: &AppHandle<R>,
    stream: TcpStream,
) -> Result<Option<()>, String> {
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .ok();
    let peer_address = stream.peer_addr().ok().map(|a| a.ip().to_string());
    let mut reader = BufReader::new(stream);

    let header_len = match reader.read_u32::<BigEndian>() {
        Ok(v) => v,
        Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => {
            // Empty connection — heartbeat probe. Silent.
            return Ok(None);
        }
        Err(e) => return Err(e.to_string()),
    };
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
            from_address: peer_address,
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
    Ok(Some(()))
}

// ─── outgoing ─────────────────────────────────────────────────────────────

#[tauri::command]
pub fn send_file<R: Runtime>(
    app: AppHandle<R>,
    file_id: String,
    source_path: String,
    peers: Vec<String>,
) -> Result<SentFile, String> {
    let original = PathBuf::from(&source_path);
    let from = discovery::own_device_name();

    if original.is_dir() {
        // Folders go through a background coordinator: it emits `zip-start`,
        // does the (slow) zip, emits `zip-complete` with the real name+size,
        // fans the send threads out, and finally deletes the temp zip. We
        // return immediately with a provisional payload so the UI keeps
        // responding while the zip runs.
        let dir_name = original
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("folder")
            .to_string();
        let provisional = SentFile {
            id: file_id.clone(),
            name: dir_name.clone(),
            size: 0,
            from: from.clone(),
        };

        let app_for_thread = app.clone();
        let id_for_thread = file_id.clone();
        let from_for_thread = from.clone();
        thread::spawn(move || {
            run_folder_send(
                app_for_thread,
                id_for_thread,
                original,
                dir_name,
                from_for_thread,
                peers,
            );
        });

        return Ok(provisional);
    }

    if !original.is_file() {
        return Err(format!("not a file or directory: {source_path}"));
    }

    let name = original
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("file")
        .to_string();
    let metadata = fs::metadata(&original).map_err(|e| format!("stat: {e}"))?;
    let size = metadata.len();
    let header = FileHeader {
        file_id: file_id.clone(),
        name: name.clone(),
        size,
        from: from.clone(),
    };

    for peer in &peers {
        let app = app.clone();
        let header = header.clone();
        let path = original.clone();
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

/// Coordinator thread for sending a directory: emit zip events, zip, fan out
/// per-peer send threads, await them, then clean up the temp zip.
fn run_folder_send<R: Runtime>(
    app: AppHandle<R>,
    file_id: String,
    dir_path: PathBuf,
    dir_name: String,
    from: String,
    peers: Vec<String>,
) {
    let zip_name = format!("{}.zip", dir_name);

    // Pre-scan: sum uncompressed sizes so the frontend can show a real
    // percentage during zip. Cheap compared to the actual compression.
    let total_bytes = scan_total_bytes(&dir_path);
    let _ = app.emit(
        "transfer-zip-start",
        ZipStartPayload {
            id: file_id.clone(),
            name: zip_name.clone(),
            total: total_bytes,
        },
    );

    let zip_path = match zip_dir_to_temp(&dir_path, &app, &file_id, total_bytes) {
        Ok(p) => p,
        Err(e) => {
            log::warn!("zip failed for {}: {e}", dir_path.display());
            let _ = app.emit(
                "transfer-error",
                ErrorPayload {
                    id: file_id,
                    direction: "send",
                    peer: None,
                    message: format!("zip: {e}"),
                },
            );
            return;
        }
    };

    let size = match fs::metadata(&zip_path) {
        Ok(m) => m.len(),
        Err(e) => {
            log::warn!("stat zip failed: {e}");
            let _ = fs::remove_file(&zip_path);
            let _ = app.emit(
                "transfer-error",
                ErrorPayload {
                    id: file_id,
                    direction: "send",
                    peer: None,
                    message: format!("stat zip: {e}"),
                },
            );
            return;
        }
    };

    let _ = app.emit(
        "transfer-zip-complete",
        ZipCompletePayload {
            id: file_id.clone(),
            name: zip_name.clone(),
            size,
        },
    );

    let header = FileHeader {
        file_id: file_id.clone(),
        name: zip_name,
        size,
        from,
    };

    let mut handles = Vec::with_capacity(peers.len());
    for peer in &peers {
        let app = app.clone();
        let header = header.clone();
        let path = zip_path.clone();
        let peer = peer.clone();
        let handle = thread::spawn(move || {
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
        handles.push(handle);
    }

    for h in handles {
        let _ = h.join();
    }
    match fs::remove_file(&zip_path) {
        Ok(_) => log::info!("temp zip cleaned up: {}", zip_path.display()),
        Err(e) => log::warn!("temp zip cleanup failed for {}: {e}", zip_path.display()),
    }
}

/// Walk `src` and return the sum of file sizes (best-effort: unreadable
/// entries are skipped). Used as the denominator for zip progress events.
fn scan_total_bytes(src: &std::path::Path) -> u64 {
    let mut total: u64 = 0;
    for entry in walkdir::WalkDir::new(src).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                total = total.saturating_add(meta.len());
            }
        }
    }
    total
}

/// Zip every entry under `src` into a freshly-named temp file. Emits
/// `transfer-zip-progress` events as compression proceeds so the UI can show a
/// real percentage. Paths inside the archive use forward slashes so the
/// archive opens cleanly on every OS.
fn zip_dir_to_temp<R: Runtime>(
    src: &std::path::Path,
    app: &AppHandle<R>,
    file_id: &str,
    total_bytes: u64,
) -> Result<PathBuf, String> {
    let base = src
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("folder");
    let id = uuid::Uuid::new_v4();
    let dest = std::env::temp_dir().join(format!("xhare-{id}-{base}.zip"));

    let file = File::create(&dest).map_err(|e| format!("create zip: {e}"))?;
    let mut zip = zip::ZipWriter::new(BufWriter::new(file));
    let options: zip::write::SimpleFileOptions = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut written: u64 = 0;
    let mut last_emitted: u64 = 0;
    // Emit at most once per 64KB of input read — keeps the channel from
    // flooding for tiny files while still feeling smooth on big files.
    const EMIT_EVERY: u64 = 64 * 1024;
    let mut buf = vec![0u8; 64 * 1024];

    for entry in walkdir::WalkDir::new(src) {
        let entry = entry.map_err(|e| format!("walk: {e}"))?;
        let p = entry.path();
        let Ok(rel) = p.strip_prefix(src) else { continue };
        if rel.as_os_str().is_empty() {
            continue;
        }
        let rel_str = rel.to_string_lossy().replace('\\', "/");
        if entry.file_type().is_dir() {
            zip.add_directory(&rel_str, options)
                .map_err(|e| format!("zip add_directory: {e}"))?;
        } else if entry.file_type().is_file() {
            zip.start_file(&rel_str, options)
                .map_err(|e| format!("zip start_file: {e}"))?;
            let mut f = File::open(p).map_err(|e| format!("open {}: {e}", p.display()))?;
            loop {
                let n = f.read(&mut buf).map_err(|e| format!("read: {e}"))?;
                if n == 0 {
                    break;
                }
                use std::io::Write;
                zip.write_all(&buf[..n]).map_err(|e| format!("write zip: {e}"))?;
                written = written.saturating_add(n as u64);
                if written - last_emitted >= EMIT_EVERY {
                    last_emitted = written;
                    let _ = app.emit(
                        "transfer-zip-progress",
                        ZipProgressPayload {
                            id: file_id.to_string(),
                            bytes: written,
                            total: total_bytes,
                        },
                    );
                }
            }
        }
        // Symlinks and other types are skipped.
    }

    // Final tick: guarantee the UI lands exactly at 100% before zip-complete.
    let _ = app.emit(
        "transfer-zip-progress",
        ZipProgressPayload {
            id: file_id.to_string(),
            bytes: total_bytes,
            total: total_bytes,
        },
    );

    zip.finish().map_err(|e| format!("zip finish: {e}"))?;
    Ok(dest)
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

/// Copy a previously-cached file to the user-chosen destination folder.
/// `source_path` is the actual path in the OS cache; `output_name` is the
/// desired filename in `destination_dir`. If a file with that name already
/// exists, append `(1)`, `(2)`, … to the stem until a free slot is found.
#[tauri::command]
pub fn save_cached_file(
    source_path: String,
    output_name: String,
    destination_dir: String,
) -> Result<String, String> {
    let src = PathBuf::from(&source_path);
    if !src.is_file() {
        return Err(format!("cache file missing: {source_path}"));
    }
    let dest_dir = PathBuf::from(destination_dir);
    fs::create_dir_all(&dest_dir).map_err(|e| format!("create dest dir: {e}"))?;
    let dest = unique_destination(&dest_dir, &output_name);
    fs::copy(&src, &dest).map_err(|e| format!("copy: {e}"))?;
    Ok(dest.to_string_lossy().to_string())
}

/// Return a path inside `dir` that doesn't collide with an existing file. If
/// `name` is free, returns `dir/name`. Otherwise tries `dir/<stem> (1).<ext>`,
/// `(2)`, etc. up to a sane cap.
fn unique_destination(dir: &std::path::Path, name: &str) -> PathBuf {
    let candidate = dir.join(name);
    if !candidate.exists() {
        return candidate;
    }
    let (stem, ext) = match name.rfind('.') {
        Some(i) if i > 0 => (&name[..i], Some(&name[i + 1..])),
        _ => (name, None),
    };
    for n in 1..10_000 {
        let new_name = match ext {
            Some(e) => format!("{stem} ({n}).{e}"),
            None => format!("{stem} ({n})"),
        };
        let candidate = dir.join(new_name);
        if !candidate.exists() {
            return candidate;
        }
    }
    // Shouldn't happen, but fall back to the original name (will overwrite).
    dir.join(name)
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

/// Read file paths from the OS clipboard. Returns an empty vec when the
/// clipboard contains no files (e.g. it has text or image data instead). Uses
/// `osascript` on macOS and PowerShell on Windows so we don't pull in
/// platform-specific clipboard crates.
#[tauri::command]
pub fn read_clipboard_paths() -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        // `the clipboard as «class furl»` only ever returns the first file,
        // so we go through NSPasteboard via the AppleScriptObjC bridge.
        // `readObjectsForClasses:{NSURL}` returns *every* file URL on the
        // pasteboard, which is what we need for multi-file copies from Finder.
        let script = r#"
use framework "Foundation"
use framework "AppKit"

try
    set pb to current application's NSPasteboard's generalPasteboard()
    set theURLs to pb's readObjectsForClasses:{current application's NSURL} options:(missing value)
    if theURLs is missing value then return ""
    set output to ""
    set urlCount to count of theURLs
    repeat with i from 1 to urlCount
        set u to item i of theURLs
        set p to (u's |path|()) as text
        if p is not "" then
            set output to output & p & linefeed
        end if
    end repeat
    return output
on error
    return ""
end try
        "#;
        let out = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output();
        if let Ok(o) = out {
            let s = String::from_utf8_lossy(&o.stdout);
            return s
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
        }
        return Vec::new();
    }
    #[cfg(target_os = "windows")]
    {
        // FileDropList yields plain string paths, not FileInfo, so `$_` is
        // what we want — `$_.FullName` was dropping every line.
        let script = "Get-Clipboard -Format FileDropList | ForEach-Object { $_ }";
        let out = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .output();
        if let Ok(o) = out {
            let s = String::from_utf8_lossy(&o.stdout);
            return s
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
        }
        return Vec::new();
    }
    #[allow(unreachable_code)]
    Vec::new()
}

/// Write a list of file paths to the OS clipboard as a *file reference* (not
/// plain text), so pasting in Finder/Explorer drops the actual files and
/// pasting in chat apps (WhatsApp, iMessage, Telegram, …) attaches them as
/// images/videos when applicable. Uses AppleScriptObjC (`NSPasteboard`) on
/// macOS and `System.Windows.Forms.Clipboard.SetFileDropList` on Windows.
#[tauri::command]
pub fn copy_paths_to_clipboard(paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Err("no paths".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        let mut adds = String::new();
        for p in &paths {
            // AppleScript string literal escaping — backslash and quote.
            let escaped = p.replace('\\', "\\\\").replace('"', "\\\"");
            adds.push_str(&format!(
                "theURLs's addObject:(current application's NSURL's fileURLWithPath:\"{}\")\n",
                escaped
            ));
        }
        let script = format!(
            "use framework \"Foundation\"\n\
             use framework \"AppKit\"\n\
             set theURLs to current application's NSMutableArray's array()\n\
             {adds}\
             set pb to current application's NSPasteboard's generalPasteboard()\n\
             pb's clearContents()\n\
             pb's writeObjects:theURLs\n"
        );
        let out = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("osascript: {e}"))?;
        if !out.status.success() {
            return Err(format!(
                "osascript failed: {}",
                String::from_utf8_lossy(&out.stderr)
            ));
        }
        return Ok(());
    }
    #[cfg(target_os = "windows")]
    {
        let mut lines = String::new();
        lines.push_str(
            "$col = New-Object System.Collections.Specialized.StringCollection\n",
        );
        for p in &paths {
            let escaped = p.replace('\'', "''");
            lines.push_str(&format!("[void]$col.Add('{}')\n", escaped));
        }
        let script = format!(
            "Add-Type -AssemblyName System.Windows.Forms\n\
             {lines}\
             [System.Windows.Forms.Clipboard]::SetFileDropList($col)\n"
        );
        // -STA is required: clipboard APIs need a single-threaded apartment.
        let out = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-STA",
                "-Command",
                &script,
            ])
            .output()
            .map_err(|e| format!("powershell: {e}"))?;
        if !out.status.success() {
            return Err(format!(
                "powershell failed: {}",
                String::from_utf8_lossy(&out.stderr)
            ));
        }
        return Ok(());
    }
    #[allow(unreachable_code)]
    Err("unsupported platform".to_string())
}

/// Persist an in-memory blob (e.g. an image from the clipboard) to a temp file
/// and return the absolute path. The caller is responsible for invoking
/// `send_file` with the returned path. The temp file lives until the OS cleans
/// the temp dir; for clipboard sends that's acceptable.
#[tauri::command]
pub fn save_clipboard_blob(name: String, bytes: Vec<u8>) -> Result<String, String> {
    let safe_name = sanitize_temp_name(&name);
    let id = uuid::Uuid::new_v4();
    let path = std::env::temp_dir().join(format!("xhare-clip-{id}-{safe_name}"));
    let mut file = File::create(&path).map_err(|e| format!("create temp: {e}"))?;
    file.write_all(&bytes).map_err(|e| format!("write temp: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}

fn sanitize_temp_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    if cleaned.is_empty() {
        "clipboard.bin".to_string()
    } else {
        cleaned
    }
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
