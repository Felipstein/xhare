// mDNS-SD based local-network device discovery.
//
// Advertises this machine as `_xhare._tcp.local.` and browses for other peers
// of the same service type. Maintains an in-memory map of currently-known
// devices and emits Tauri events as that map changes.
//
// Cross-platform: macOS / Windows / Linux all use the same code path. The
// mdns-sd crate handles platform multicast quirks internally.

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use mdns_sd::{Receiver, ServiceDaemon, ServiceEvent, ServiceInfo};
use once_cell::sync::OnceCell;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};

pub const SERVICE_TYPE: &str = "_xhare._tcp.local.";
pub const SERVICE_PORT: u16 = 9876;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub name: String,
    pub address: String,
    pub status: DeviceStatus,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum DeviceStatus {
    Online,
    Offline,
}

struct State {
    devices: Mutex<HashMap<String, Device>>, // keyed by address
    daemon: ServiceDaemon,
    own_fullname: Mutex<Option<String>>,
}

static STATE: OnceCell<Arc<State>> = OnceCell::new();

fn state() -> &'static Arc<State> {
    STATE.get().expect("discovery not initialized")
}

/// Bootstrap mDNS discovery. Called once on app startup.
/// Spawns a background thread that owns the browse loop.
pub fn init<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let daemon = ServiceDaemon::new().map_err(|e| format!("ServiceDaemon::new: {e}"))?;

    let state = Arc::new(State {
        devices: Mutex::new(HashMap::new()),
        daemon,
        own_fullname: Mutex::new(None),
    });
    STATE
        .set(state.clone())
        .map_err(|_| "discovery already initialized")?;

    register_self(&state)?;
    spawn_browse_loop(app, state);

    Ok(())
}

/// Sanitize a hostname into a stable, mDNS-friendly device name.
fn sanitize_hostname(raw: &str) -> String {
    let trimmed = raw.trim_end_matches(".local").trim();
    let lower = trimmed.to_lowercase();
    let cleaned: String = lower
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' { c } else { '-' })
        .collect();
    // collapse consecutive dashes
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

/// Register this machine as a service.
fn register_self(state: &Arc<State>) -> Result<(), String> {
    let raw = local_hostname();
    let instance = sanitize_hostname(&raw);
    // mdns-sd requires a hostname that ends with `.local.`
    let mdns_host = format!("{instance}.local.");

    // We don't bind to any IP explicitly — mdns-sd picks usable local interfaces.
    let info = ServiceInfo::new(
        SERVICE_TYPE,
        &instance,
        &mdns_host,
        "",
        SERVICE_PORT,
        &[("name", instance.as_str()), ("version", env!("CARGO_PKG_VERSION"))][..],
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

/// Background thread that owns the browse loop and emits events to the front.
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
            // Ignore ourselves
            if let Some(own) = state.own_fullname.lock().unwrap().as_ref() {
                if info.get_fullname() == own {
                    return;
                }
            }
            let Some(device) = device_from_info(&info) else {
                return;
            };
            let is_new = {
                let mut devs = state.devices.lock().unwrap();
                let prev = devs.insert(device.address.clone(), device.clone());
                prev.is_none() || prev.map(|p| p.status) != Some(DeviceStatus::Online)
            };
            if is_new {
                let _ = app.emit("device-discovered", device.clone());
            } else {
                let _ = app.emit(
                    "device-status-changed",
                    StatusChangedPayload {
                        address: device.address.clone(),
                        status: DeviceStatus::Online,
                    },
                );
            }
        }
        ServiceEvent::ServiceRemoved(_service_type, fullname) => {
            // Match by fullname → mark all matching devices offline.
            let mut devs = state.devices.lock().unwrap();
            let mut offline_addresses: Vec<String> = Vec::new();
            for (addr, dev) in devs.iter_mut() {
                if dev.name == sanitize_fullname(&fullname) && dev.status == DeviceStatus::Online {
                    dev.status = DeviceStatus::Offline;
                    offline_addresses.push(addr.clone());
                }
            }
            drop(devs);
            for addr in offline_addresses {
                let _ = app.emit(
                    "device-status-changed",
                    StatusChangedPayload {
                        address: addr,
                        status: DeviceStatus::Offline,
                    },
                );
            }
        }
        _ => {}
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusChangedPayload {
    address: String,
    status: DeviceStatus,
}

fn sanitize_fullname(fullname: &str) -> String {
    // Fullname looks like "name._xhare._tcp.local." — extract the instance.
    fullname
        .split('.')
        .next()
        .unwrap_or("")
        .to_string()
}

fn device_from_info(info: &ServiceInfo) -> Option<Device> {
    let addr = info.get_addresses().iter().next().copied()?;
    let address = ip_to_string(addr);
    let name = info
        .get_property_val_str("name")
        .map(|s| s.to_string())
        .unwrap_or_else(|| sanitize_fullname(info.get_fullname()));
    Some(Device {
        name,
        address,
        status: DeviceStatus::Online,
    })
}

fn ip_to_string(ip: IpAddr) -> String {
    ip.to_string()
}

// ─── Public commands ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_devices() -> Vec<Device> {
    let state = state();
    let devs = state.devices.lock().unwrap();
    devs.values().cloned().collect()
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
        name: final_name,
        address: address.clone(),
        status: DeviceStatus::Online,
    };
    let state = state();
    state
        .devices
        .lock()
        .unwrap()
        .insert(address, device.clone());
    let _ = app.emit("device-discovered", device.clone());
    Ok(device)
}

#[tauri::command]
pub fn remove_device<R: Runtime>(app: AppHandle<R>, address: String) -> Result<(), String> {
    let state = state();
    let removed = state.devices.lock().unwrap().remove(&address).is_some();
    if removed {
        let _ = app.emit("device-lost", LostPayload { address });
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
struct LostPayload {
    address: String,
}

/// Returns this machine's primary local-network IP (the one routed to the
/// default gateway). Empty string on failure.
#[tauri::command]
pub fn get_local_ip() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_default()
}

/// Best-effort reverse DNS / hostname probe for `add by IP` UX:
/// when the user enters an IP and blurs the field, we try to find a name to
/// pre-fill. Times out fast; failures return None.
#[tauri::command]
pub fn probe_device(address: String) -> Option<String> {
    probe_hostname_sync(&address)
}

fn probe_hostname_sync(address: &str) -> Option<String> {
    let parsed: IpAddr = address.parse().ok()?;
    // Run lookup in a thread with a timeout. dns_lookup is blocking.
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

/// Tauri app setup entry — wire discovery into the running app.
pub fn setup<R: Runtime>(app: &tauri::App<R>) {
    let handle = app.handle().clone();
    if let Err(e) = init(handle) {
        log::error!("discovery init failed: {e}");
    }
}
