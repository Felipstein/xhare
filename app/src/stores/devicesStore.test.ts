import { beforeEach, describe, it, expect } from 'vitest';

import { useDevicesStore } from './devicesStore';

describe('devicesStore', () => {
  beforeEach(() => {
    useDevicesStore.getState().reset();
  });

  it('seeds with mock devices', () => {
    expect(useDevicesStore.getState().devices.length).toBeGreaterThan(0);
  });

  it('addDevice appends a new device', () => {
    const before = useDevicesStore.getState().devices.length;
    useDevicesStore
      .getState()
      .addDevice({ name: 'novo', address: '10.0.0.5', status: 'ONLINE' });
    expect(useDevicesStore.getState().devices).toHaveLength(before + 1);
  });

  it('addDevice is idempotent on address', () => {
    const existing = useDevicesStore.getState().devices[0];
    useDevicesStore.getState().addDevice({ ...existing, name: 'duplicate' });
    expect(
      useDevicesStore.getState().devices.filter((d) => d.address === existing.address),
    ).toHaveLength(1);
  });

  it('removeDevice drops by address', () => {
    const target = useDevicesStore.getState().devices[0];
    useDevicesStore.getState().removeDevice(target.address);
    expect(useDevicesStore.getState().devices.find((d) => d.address === target.address)).toBeUndefined();
  });

  it('setStatus updates status of a single device', () => {
    const target = useDevicesStore.getState().devices[0];
    useDevicesStore.getState().setStatus(target.address, 'OFFLINE');
    expect(
      useDevicesStore.getState().devices.find((d) => d.address === target.address)?.status,
    ).toBe('OFFLINE');
  });
});
