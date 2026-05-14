import { create } from 'zustand';

import type { Device } from '@/types/Device';

type DevicesState = {
  devices: Device[];
};

type DevicesActions = {
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  removeDevice: (id: string) => void;
  setStatus: (id: string, status: Device['status']) => void;
  reset: () => void;
};

const initialState: DevicesState = {
  devices: [],
};

export const useDevicesStore = create<DevicesState & DevicesActions>((set) => ({
  ...initialState,

  setDevices: (devices) => set({ devices }),

  addDevice: (device) =>
    set((s) =>
      s.devices.some((d) => d.id === device.id) ? s : { devices: [...s.devices, device] },
    ),

  removeDevice: (id) =>
    set((s) => ({
      devices: s.devices.filter((d) => d.id !== id),
    })),

  setStatus: (id, status) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, status } : d)),
    })),

  reset: () => set(initialState),
}));
