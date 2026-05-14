import { beforeEach, describe, it, expect } from 'vitest';

import { sampleDevices } from '@/test/fixtures';

import { useDevicesStore } from './devicesStore';

describe('devicesStore', () => {
  beforeEach(() => {
    useDevicesStore.getState().reset();
  });

  it('starts empty', () => {
    expect(useDevicesStore.getState().devices).toEqual([]);
  });

  it('setDevices replaces the list', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    expect(useDevicesStore.getState().devices).toHaveLength(sampleDevices.length);
  });

  it('addDevice appends a new device', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    useDevicesStore
      .getState()
      .addDevice({ name: 'novo', address: '10.0.0.5', status: 'ONLINE' });
    expect(useDevicesStore.getState().devices).toHaveLength(sampleDevices.length + 1);
  });

  it('addDevice is idempotent on address', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    const existing = sampleDevices[0];
    useDevicesStore.getState().addDevice({ ...existing, name: 'duplicate' });
    expect(
      useDevicesStore.getState().devices.filter((d) => d.address === existing.address),
    ).toHaveLength(1);
  });

  it('removeDevice drops by address', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    const target = sampleDevices[0];
    useDevicesStore.getState().removeDevice(target.address);
    expect(useDevicesStore.getState().devices.find((d) => d.address === target.address)).toBeUndefined();
  });

  it('setStatus updates status of a single device', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    const target = sampleDevices[0];
    useDevicesStore.getState().setStatus(target.address, 'OFFLINE');
    expect(
      useDevicesStore.getState().devices.find((d) => d.address === target.address)?.status,
    ).toBe('OFFLINE');
  });
});
