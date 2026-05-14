import { invoke } from '@tauri-apps/api/core';

/**
 * Returns this machine's primary local-network IP (the one routed to the
 * default gateway). Returns null if the OS couldn't determine one.
 */
export async function getLocalIp(): Promise<string | null> {
  const ip = await invoke<string>('get_local_ip');
  return ip.length > 0 ? ip : null;
}

/**
 * Returns the OS-appropriate default download folder (`~/Downloads/Xhare` on
 * macOS/Linux, `%USERPROFILE%\Downloads\Xhare` on Windows).
 */
export function getDefaultDownloadFolder(): Promise<string> {
  return invoke<string>('get_default_download_folder');
}
