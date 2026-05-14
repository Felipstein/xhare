import { invoke } from '@tauri-apps/api/core';

/**
 * Returns this machine's primary local-network IP (the one routed to the
 * default gateway). Returns null if the OS couldn't determine one.
 */
export async function getLocalIp(): Promise<string | null> {
  const ip = await invoke<string>('get_local_ip');
  return ip.length > 0 ? ip : null;
}
