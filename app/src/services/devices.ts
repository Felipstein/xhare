import { useDevicesStore } from '@/stores/devicesStore';

import type { Device } from '@/types/Device';

export type AddDeviceInput = {
  address: string;
  name?: string;
};

export async function addDeviceByIp(input: AddDeviceInput): Promise<Device> {
  const device: Device = {
    address: input.address,
    name: input.name?.trim() || input.address,
    status: 'ONLINE',
  };
  useDevicesStore.getState().addDevice(device);
  return device;
}

export async function removeDevice(address: string): Promise<void> {
  useDevicesStore.getState().removeDevice(address);
}
