// LAN scan via the system ARP table.
//
// `arp -a` exists on both macOS and Windows but produces different output
// formats. We parse both. ARP entries are populated naturally by the OS as it
// communicates with neighbors (mDNS multicast, DHCP, etc.) so by the time the
// app has been open for a few seconds the table is usually well-populated.

use std::net::Ipv4Addr;
use std::process::Command;

#[derive(Debug, Clone)]
pub struct LanEntry {
    pub ip: Ipv4Addr,
    pub hostname: Option<String>,
}

pub fn scan() -> Vec<LanEntry> {
    let mut cmd = Command::new("arp");
    cmd.arg("-a");
    // Suppress the flashing console window on Windows. `arp -a` is a console
    // app; without this flag, Windows opens a black cmd window for each call
    // and we run this every 8 seconds.
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let Ok(output) = cmd.output() else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    let text = String::from_utf8_lossy(&output.stdout);
    parse(&text)
}

/// Parse `arp -a` output. Handles macOS and Windows formats.
///
/// macOS lines look like:
///   `? (192.168.1.1) at xx:xx:xx:xx:xx:xx on en0 ifscope [ethernet]`
///   `name.local (192.168.1.42) at xx:xx:xx:xx:xx:xx on en0 ifscope [ethernet]`
///
/// Windows lines look like:
///   `  192.168.1.42          xx-xx-xx-xx-xx-xx     dynamic`
fn parse(text: &str) -> Vec<LanEntry> {
    let mut out: Vec<LanEntry> = Vec::new();
    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(entry) = parse_macos_line(line).or_else(|| parse_windows_line(line)) {
            // skip duplicates and broadcast / multicast entries
            if entry.ip.is_broadcast() || entry.ip.is_multicast() || entry.ip.is_unspecified() {
                continue;
            }
            if out.iter().any(|e| e.ip == entry.ip) {
                continue;
            }
            out.push(entry);
        }
    }
    out
}

fn parse_macos_line(line: &str) -> Option<LanEntry> {
    // "name (ip) at mac on iface ..."
    let lparen = line.find('(')?;
    let rparen = line.find(')')?;
    if rparen <= lparen + 1 {
        return None;
    }
    let ip_str = &line[lparen + 1..rparen];
    let ip: Ipv4Addr = ip_str.parse().ok()?;
    let name_part = line[..lparen].trim();
    let hostname = if name_part == "?" || name_part.is_empty() {
        None
    } else {
        Some(strip_local(name_part).to_string())
    };
    Some(LanEntry { ip, hostname })
}

fn parse_windows_line(line: &str) -> Option<LanEntry> {
    // "ip   mac   type"
    let mut parts = line.split_whitespace();
    let ip_str = parts.next()?;
    let ip: Ipv4Addr = ip_str.parse().ok()?;
    // Windows arp doesn't include hostnames.
    Some(LanEntry { ip, hostname: None })
}

fn strip_local(name: &str) -> &str {
    name.strip_suffix(".local").unwrap_or(name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_macos_format() {
        let sample = "\
? (192.168.1.1) at aa:bb:cc:dd:ee:ff on en0 ifscope [ethernet]
felipes-iphone.local (192.168.1.5) at 11:22:33:44:55:66 on en0 ifscope [ethernet]
";
        let entries = parse(sample);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].ip, "192.168.1.1".parse::<Ipv4Addr>().unwrap());
        assert_eq!(entries[0].hostname, None);
        assert_eq!(entries[1].ip, "192.168.1.5".parse::<Ipv4Addr>().unwrap());
        assert_eq!(entries[1].hostname.as_deref(), Some("felipes-iphone"));
    }

    #[test]
    fn parses_windows_format() {
        let sample = "\
Interface: 192.168.1.10 --- 0x12
  Internet Address      Physical Address      Type
  192.168.1.1           aa-bb-cc-dd-ee-ff     dynamic
  192.168.1.42          11-22-33-44-55-66     dynamic
  224.0.0.22            01-00-5e-00-00-16     static
";
        let entries = parse(sample);
        // multicast 224.x is filtered out
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].ip, "192.168.1.1".parse::<Ipv4Addr>().unwrap());
    }
}
