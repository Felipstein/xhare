import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type { Device } from '@/types/Device';

export type AddDeviceInput = {
  address: string;
  name?: string;
};

type LostPayload = { address: string };
type StatusChangedPayload = { address: string; status: Device['status'] };

export type DeviceEventHandler = {
  onDiscovered: (device: Device) => void;
  onLost: (payload: LostPayload) => void;
  onStatusChanged: (payload: StatusChangedPayload) => void;
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

export function removeDevice(address: string): Promise<void> {
  return invoke('remove_device', { address });
}

export async function probeDevice(address: string): Promise<string | null> {
  const result = await invoke<string | null>('probe_device', { address });
  return result ?? null;
}

export async function subscribeDeviceEvents(
  handler: DeviceEventHandler,
): Promise<Unsubscribe> {
  const offDiscovered = await listen<Device>('device-discovered', (e) =>
    handler.onDiscovered(e.payload),
  );
  const offLost = await listen<LostPayload>('device-lost', (e) => handler.onLost(e.payload));
  const offChanged = await listen<StatusChangedPayload>(
    'device-status-changed',
    (e) => handler.onStatusChanged(e.payload),
  );
  return () => {
    offDiscovered();
    offLost();
    offChanged();
  };
}
