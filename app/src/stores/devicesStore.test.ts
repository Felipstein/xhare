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
    useDevicesStore.getState().addDevice({
      id: 'lan:10.0.0.5',
      name: 'novo',
      address: '10.0.0.5',
      status: 'OFFLINE',
      isSelf: false,
    });
    expect(useDevicesStore.getState().devices).toHaveLength(sampleDevices.length + 1);
  });

  it('addDevice is idempotent on id', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    const existing = sampleDevices[0];
    useDevicesStore.getState().addDevice({ ...existing, name: 'duplicate' });
    expect(useDevicesStore.getState().devices.filter((d) => d.id === existing.id)).toHaveLength(
      1,
    );
  });

  it('removeDevice drops by id', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    const target = sampleDevices[0];
    useDevicesStore.getState().removeDevice(target.id);
    expect(useDevicesStore.getState().devices.find((d) => d.id === target.id)).toBeUndefined();
  });

  it('setStatus updates status of a single device', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    const target = sampleDevices[0];
    useDevicesStore.getState().setStatus(target.id, 'OFFLINE');
    expect(
      useDevicesStore.getState().devices.find((d) => d.id === target.id)?.status,
    ).toBe('OFFLINE');
  });
});
