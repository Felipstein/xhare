import { useEffect } from 'react';

import { getDevices, subscribeDeviceEvents } from '@/services/devices';
import { useDevicesStore } from '@/stores/devicesStore';

/**
 * On mount: fetch the current device snapshot from Rust, then subscribe to
 * live mDNS events. In browser dev mode this is a no-op (mock data already
 * lives in the store).
 */
export function useDeviceSubscription(): void {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const setDevices = useDevicesStore.getState().setDevices;
    const addDevice = useDevicesStore.getState().addDevice;
    const removeDevice = useDevicesStore.getState().removeDevice;
    const setStatus = useDevicesStore.getState().setStatus;

    void (async () => {
      try {
        const snapshot = await getDevices();
        if (cancelled) return;
        setDevices(snapshot);
      } catch (err) {
        console.error('getDevices failed:', err);
      }

      try {
        unsubscribe = await subscribeDeviceEvents({
          onDiscovered: (device) => addDevice(device),
          onLost: ({ address }) => removeDevice(address),
          onStatusChanged: ({ address, status }) => setStatus(address, status),
        });
      } catch (err) {
        console.error('subscribeDeviceEvents failed:', err);
      }

      if (cancelled && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);
}
