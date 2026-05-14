import { create } from 'zustand';

import { mockDevices } from '@/mock/devices';

import type { Device } from '@/types/Device';

type DevicesState = {
  devices: Device[];
};

type DevicesActions = {
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  removeDevice: (address: string) => void;
  setStatus: (address: string, status: Device['status']) => void;
  reset: () => void;
};

const initialState: DevicesState = {
  devices: mockDevices,
};

export const useDevicesStore = create<DevicesState & DevicesActions>((set) => ({
  ...initialState,

  setDevices: (devices) => set({ devices }),

  addDevice: (device) =>
    set((s) =>
      s.devices.some((d) => d.address === device.address)
        ? s
        : { devices: [...s.devices, device] },
    ),

  removeDevice: (address) =>
    set((s) => ({
      devices: s.devices.filter((d) => d.address !== address),
    })),

  setStatus: (address, status) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.address === address ? { ...d, status } : d)),
    })),

  reset: () => set(initialState),
}));
