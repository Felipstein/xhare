// mDNS + LAN discovery.
//
// Sources of truth:
//   - mDNS browse for `_xhare._tcp.local.` → which peers are running Xhare
//     (these will be ONLINE)
//   - System ARP table (`arp -a`) → all IPs currently visible on the LAN
//     (peers not in mDNS show as OFFLINE)
//
// We do NOT persist anything in memory across reconciliations. Each scan
// rebuilds the device list from the current state of both sources. A device
// that leaves the LAN disappears from the list entirely. A device that's on
// the LAN but stops advertising mDNS goes OFFLINE.

use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use mdns_sd::{Receiver, ServiceDaemon, ServiceEvent, ServiceInfo};
use once_cell::sync::OnceCell;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};

use crate::lan_scan;

pub const SERVICE_TYPE: &str = "_xhare._tcp.local.";
pub const SERVICE_PORT: u16 = 9876;

const LAN_SCAN_INTERVAL: Duration = Duration::from_secs(8);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    /// Stable id.
    ///   - `self:<fullname>`   — this machine
    ///   - `mdns:<fullname>`   — peer running Xhare
    ///   - `lan:<ip>`          — peer on the LAN but NOT running Xhare
    ///   - `manual:<ip>`       — manually-added peer
    pub id: String,
    pub name: String,
    pub address: String,
    pub status: DeviceStatus,
    pub is_self: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum DeviceStatus {
    Online,
    Offline,
}

#[derive(Debug, Clone)]
struct MdnsPeer {
    fullname: String,
    name: String,
    address: String,
}

struct State {
    daemon: ServiceDaemon,
    own_fullname: Mutex<Option<String>>,
    /// Xhare peers discovered via mDNS (excluding self).
    mdns: Mutex<HashMap<String, MdnsPeer>>,
    /// IPs currently visible in the OS ARP table.
    lan: Mutex<Vec<lan_scan::LanEntry>>,
    /// Manually-added peers, keyed by IP.
    manual: Mutex<HashMap<String, Device>>,
    /// Cached reverse-DNS results keyed by IP. `None` means we tried and
    /// failed (don't retry forever).
    hostname_cache: Mutex<HashMap<String, Option<String>>>,
}

static STATE: OnceCell<Arc<State>> = OnceCell::new();

fn state() -> &'static Arc<State> {
    STATE.get().expect("discovery not initialized")
}

pub fn init<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let daemon = ServiceDaemon::new().map_err(|e| format!("ServiceDaemon::new: {e}"))?;

    let state = Arc::new(State {
        daemon,
        own_fullname: Mutex::new(None),
        mdns: Mutex::new(HashMap::new()),
        lan: Mutex::new(Vec::new()),
        manual: Mutex::new(HashMap::new()),
        hostname_cache: Mutex::new(HashMap::new()),
    });
    STATE
        .set(state.clone())
        .map_err(|_| "discovery already initialized")?;

    register_self(&state)?;
    spawn_browse_loop(app.clone(), state.clone());
    spawn_lan_refresher(app, state);

    Ok(())
}

pub fn shutdown() {
    if let Some(state) = STATE.get() {
        let _ = state.daemon.shutdown();
    }
}

// ─── helpers ──────────────────────────────────────────────────────────────

fn sanitize_hostname(raw: &str) -> String {
    let trimmed = raw.trim_end_matches(".local").trim();
    let lower = trimmed.to_lowercase();
    let cleaned: String = lower
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let mut out = String::with_capacity(cleaned.len());
    let mut prev_dash = false;
    for c in cleaned.chars() {
        let is_dash = c == '-';
        if is_dash && prev_dash {
            continue;
        }
        out.push(c);
        prev_dash = is_dash;
    }
    let trimmed = out.trim_matches('-');
    if trimmed.is_empty() {
        "xhare-device".to_string()
    } else {
        trimmed.to_string()
    }
}

fn local_hostname() -> String {
    hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .unwrap_or_else(|| "xhare-device".to_string())
}

fn local_ip_string() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_default()
}

fn sanitize_instance(fullname: &str) -> String {
    fullname.split('.').next().unwrap_or("").to_string()
}

/// Pick the most likely-routable peer IP.
///
/// On Windows especially, a single peer often advertises 3+ addresses via
/// mDNS (Wi-Fi + Hyper-V virtual switch + WSL bridge). All look "private"
/// but only one is actually reachable from us. Strategy, in order:
///   1. Peer IP in the same /24 as our own primary IP — almost always the right one
///   2. Any private IPv4 (RFC 1918)
///   3. Any IPv4
///   4. Anything left
fn pick_best_address(info: &ServiceInfo) -> Option<IpAddr> {
    let addrs: Vec<IpAddr> = info.get_addresses().iter().copied().collect();
    let own_octets = match local_ip_address::local_ip().ok() {
        Some(IpAddr::V4(v4)) => Some(v4.octets()),
        _ => None,
    };

    if let Some(o) = own_octets {
        if let Some(ip) = addrs
            .iter()
            .find(|ip| matches!(ip, IpAddr::V4(v4) if {
                let p = v4.octets();
                p[0] == o[0] && p[1] == o[1] && p[2] == o[2]
            }))
            .copied()
        {
            return Some(ip);
        }
    }
    if let Some(ip) = addrs
        .iter()
        .find(|ip| matches!(ip, IpAddr::V4(v4) if is_private_v4(v4)))
        .copied()
    {
        return Some(ip);
    }
    if let Some(ip) = addrs.iter().find(|ip| matches!(ip, IpAddr::V4(_))).copied() {
        return Some(ip);
    }
    addrs.into_iter().next()
}

fn is_private_v4(ip: &Ipv4Addr) -> bool {
    let o = ip.octets();
    o[0] == 10
        || (o[0] == 172 && (16..=31).contains(&o[1]))
        || (o[0] == 192 && o[1] == 168)
}

// ─── self registration ────────────────────────────────────────────────────

fn register_self(state: &Arc<State>) -> Result<(), String> {
    let instance = sanitize_hostname(&local_hostname());
    let mdns_host = format!("{instance}.local.");

    let info = ServiceInfo::new(
        SERVICE_TYPE,
        &instance,
        &mdns_host,
        "",
        SERVICE_PORT,
        &[
            ("name", instance.as_str()),
            ("version", env!("CARGO_PKG_VERSION")),
        ][..],
    )
    .map_err(|e| format!("ServiceInfo::new: {e}"))?
    .enable_addr_auto();

    let fullname = info.get_fullname().to_string();
    *state.own_fullname.lock().unwrap() = Some(fullname);

    state
        .daemon
        .register(info)
        .map_err(|e| format!("daemon.register: {e}"))?;
    Ok(())
}

pub fn own_device_name() -> String {
    sanitize_hostname(&local_hostname())
}

fn own_device() -> Device {
    let name = sanitize_hostname(&local_hostname());
    let address = local_ip_string();
    let fullname = state()
        .own_fullname
        .lock()
        .unwrap()
        .clone()
        .unwrap_or_default();
    Device {
        id: format!("self:{fullname}"),
        name,
        address,
        status: DeviceStatus::Online,
        is_self: true,
    }
}

// ─── mDNS browse loop ─────────────────────────────────────────────────────

fn spawn_browse_loop<R: Runtime>(app: AppHandle<R>, state: Arc<State>) {
    let receiver: Receiver<ServiceEvent> = match state.daemon.browse(SERVICE_TYPE) {
        Ok(r) => r,
        Err(e) => {
            log::error!("mDNS browse failed: {e}");
            return;
        }
    };

    thread::spawn(move || {
        while let Ok(event) = receiver.recv() {
            handle_service_event(&app, &state, event);
        }
        log::warn!("mDNS browse loop ended");
    });
}

fn handle_service_event<R: Runtime>(app: &AppHandle<R>, state: &Arc<State>, event: ServiceEvent) {
    match event {
        ServiceEvent::ServiceResolved(info) => {
            if let Some(own) = state.own_fullname.lock().unwrap().as_ref() {
                if info.get_fullname() == own {
                    return;
                }
            }
            let Some(peer) = peer_from_info(&info) else {
                return;
            };
            state.mdns.lock().unwrap().insert(peer.fullname.clone(), peer);
            emit_devices(app);
        }
        ServiceEvent::ServiceRemoved(_, fullname) => {
            state.mdns.lock().unwrap().remove(&fullname);
            emit_devices(app);
        }
        _ => {}
    }
}

fn peer_from_info(info: &ServiceInfo) -> Option<MdnsPeer> {
    let addr = pick_best_address(info)?;
    let address = addr.to_string();
    let name = info
        .get_property_val_str("name")
        .map(|s| s.to_string())
        .unwrap_or_else(|| sanitize_instance(info.get_fullname()));
    Some(MdnsPeer {
        fullname: info.get_fullname().to_string(),
        name,
        address,
    })
}

// ─── LAN refresher ────────────────────────────────────────────────────────

fn spawn_lan_refresher<R: Runtime>(app: AppHandle<R>, state: Arc<State>) {
    thread::spawn(move || loop {
        let mut entries = lan_scan::scan();
        enrich_with_hostnames(&state, &mut entries);
        *state.lan.lock().unwrap() = entries;
        emit_devices(&app);
        thread::sleep(LAN_SCAN_INTERVAL);
    });
}

/// Fill in missing hostnames via reverse DNS, using an in-memory cache so we
/// only ever pay the lookup cost once per IP per app session. Lookups run in
/// parallel with a short per-IP timeout — total wall time stays under ~2s
/// even for a fully unknown /24.
fn enrich_with_hostnames(state: &Arc<State>, entries: &mut Vec<lan_scan::LanEntry>) {
    let to_resolve: Vec<std::net::Ipv4Addr> = {
        let cache = state.hostname_cache.lock().unwrap();
        entries
            .iter()
            .filter(|e| e.hostname.is_none() && !cache.contains_key(&e.ip.to_string()))
            .map(|e| e.ip)
            .collect()
    };

    if !to_resolve.is_empty() {
        let mut handles = Vec::with_capacity(to_resolve.len());
        for ip in to_resolve {
            handles.push((
                ip,
                thread::spawn(move || {
                    let parsed: IpAddr = IpAddr::V4(ip);
                    dns_lookup::lookup_addr(&parsed).ok()
                }),
            ));
        }
        let deadline = std::time::Instant::now() + Duration::from_secs(2);
        let mut cache = state.hostname_cache.lock().unwrap();
        for (ip, handle) in handles {
            let remaining = deadline.saturating_duration_since(std::time::Instant::now());
            let result = if remaining.is_zero() {
                None
            } else {
                // join() blocks; we approximate timeout by checking is_finished
                let start = std::time::Instant::now();
                while !handle.is_finished() && start.elapsed() < remaining {
                    thread::sleep(Duration::from_millis(20));
                }
                if handle.is_finished() {
                    handle.join().ok().flatten()
                } else {
                    None
                }
            };
            let cleaned = result
                .map(|h| sanitize_hostname(&h))
                .filter(|h| !h.is_empty() && h != "xhare-device");
            cache.insert(ip.to_string(), cleaned);
        }
    }

    let cache = state.hostname_cache.lock().unwrap();
    for entry in entries.iter_mut() {
        if entry.hostname.is_none() {
            if let Some(Some(name)) = cache.get(&entry.ip.to_string()) {
                entry.hostname = Some(name.clone());
            }
        }
    }
}

// ─── Reconciliation: build the canonical device list ──────────────────────

fn build_devices() -> Vec<Device> {
    let mut list: Vec<Device> = Vec::new();
    list.push(own_device());

    let own_ip = local_ip_string();
    let mdns = state().mdns.lock().unwrap().clone();
    let lan = state().lan.lock().unwrap().clone();
    let manual = state().manual.lock().unwrap().clone();

    let mut seen_ips: Vec<String> = vec![own_ip];

    // mDNS peers (online via Xhare).
    for peer in mdns.values() {
        list.push(Device {
            id: format!("mdns:{}", peer.fullname),
            name: peer.name.clone(),
            address: peer.address.clone(),
            status: DeviceStatus::Online,
            is_self: false,
        });
        seen_ips.push(peer.address.clone());
    }

    // Manually-added peers. Status is NOT trusted: a manual entry is only
    // ONLINE if its IP also shows up in mDNS — otherwise it's OFFLINE.
    // (mDNS-matched manuals are already covered by the loop above.)
    for dev in manual.values() {
        if seen_ips.contains(&dev.address) {
            continue;
        }
        list.push(Device {
            id: dev.id.clone(),
            name: dev.name.clone(),
            address: dev.address.clone(),
            status: DeviceStatus::Offline,
            is_self: false,
        });
        seen_ips.push(dev.address.clone());
    }

    // ARP entries that aren't already accounted for → offline.
    for entry in lan.iter() {
        let ip_str = entry.ip.to_string();
        if seen_ips.contains(&ip_str) {
            continue;
        }
        let name = entry
            .hostname
            .clone()
            .map(|h| sanitize_hostname(&h))
            .unwrap_or_else(|| ip_str.clone());
        list.push(Device {
            id: format!("lan:{ip_str}"),
            name,
            address: ip_str,
            status: DeviceStatus::Offline,
            is_self: false,
        });
    }

    list
}

fn emit_devices<R: Runtime>(app: &AppHandle<R>) {
    let _ = app.emit("devices", build_devices());
}

// ─── Public commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_devices() -> Vec<Device> {
    build_devices()
}

#[tauri::command]
pub fn add_device_by_ip<R: Runtime>(
    app: AppHandle<R>,
    address: String,
    name: Option<String>,
) -> Result<Device, String> {
    let address = address.trim().to_string();
    if address.is_empty() {
        return Err("address is empty".into());
    }
    let final_name = match name {
        Some(n) if !n.trim().is_empty() => sanitize_hostname(n.trim()),
        _ => probe_hostname_sync(&address).unwrap_or_else(|| address.clone()),
    };
    let device = Device {
        id: format!("manual:{address}"),
        name: final_name,
        address: address.clone(),
        status: DeviceStatus::Online,
        is_self: false,
    };
    state()
        .manual
        .lock()
        .unwrap()
        .insert(address, device.clone());
    emit_devices(&app);
    Ok(device)
}

#[tauri::command]
pub fn remove_device<R: Runtime>(app: AppHandle<R>, id: String) -> Result<(), String> {
    if let Some(stripped) = id.strip_prefix("manual:") {
        state().manual.lock().unwrap().remove(stripped);
        emit_devices(&app);
    }
    Ok(())
}

#[tauri::command]
pub fn get_local_ip() -> String {
    local_ip_string()
}

#[tauri::command]
pub fn get_default_download_folder() -> String {
    dirs::download_dir()
        .map(|p| p.join("Xhare").to_string_lossy().to_string())
        .unwrap_or_else(|| {
            dirs::home_dir()
                .map(|p| p.join("Downloads").join("Xhare").to_string_lossy().to_string())
                .unwrap_or_default()
        })
}

#[tauri::command]
pub fn probe_device(address: String) -> Option<String> {
    probe_hostname_sync(&address)
}

fn probe_hostname_sync(address: &str) -> Option<String> {
    let parsed: IpAddr = address.parse().ok()?;
    let (tx, rx) = std::sync::mpsc::channel();
    thread::spawn(move || {
        let result = dns_lookup::lookup_addr(&parsed).ok();
        let _ = tx.send(result);
    });
    let hostname = rx.recv_timeout(Duration::from_millis(1500)).ok().flatten()?;
    let cleaned = sanitize_hostname(&hostname);
    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned)
    }
}

pub fn setup<R: Runtime>(app: &tauri::App<R>) {
    let handle = app.handle().clone();
    if let Err(e) = init(handle) {
        log::error!("discovery init failed: {e}");
    }
}
