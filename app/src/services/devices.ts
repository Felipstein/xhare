import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type { Device } from '@/types/Device';

export type AddDeviceInput = {
  address: string;
  name?: string;
};

export type Unsubscribe = () => void;

export function getDevices(): Promise<Device[]> {
  return invoke<Device[]>('get_devices');
}

export function addDeviceByIp(input: AddDeviceInput): Promise<Device> {
  return invoke<Device>('add_device_by_ip', {
    address: input.address,
    name: input.name ?? null,
  });
}

export function removeDevice(id: string): Promise<void> {
  return invoke('remove_device', { id });
}

export async function probeDevice(address: string): Promise<string | null> {
  const result = await invoke<string | null>('probe_device', { address });
  return result ?? null;
}

/**
 * Subscribe to the full device list. Rust emits the entire list every time
 * something changes (mDNS resolves/removes, LAN refresher fires, manual add,
 * etc.), so the frontend just replaces its state. Returns an unsubscribe fn.
 */
export async function subscribeDevices(
  onChange: (devices: Device[]) => void,
): Promise<Unsubscribe> {
  return listen<Device[]>('devices', (e) => onChange(e.payload));
}
