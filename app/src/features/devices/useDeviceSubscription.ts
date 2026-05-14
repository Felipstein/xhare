import { useEffect } from 'react';

import { getDevices, subscribeDevices } from '@/services/devices';
import { useDevicesStore } from '@/stores/devicesStore';

/**
 * On mount: fetch the initial device list from Rust, then subscribe to the
 * `devices` event which fires with the full list every time the Rust side
 * reconciles (mDNS, LAN scan, manual add/remove).
 */
export function useDeviceSubscription(): void {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const setDevices = useDevicesStore.getState().setDevices;

    void (async () => {
      try {
        const snapshot = await getDevices();
        if (!cancelled) setDevices(snapshot);
      } catch (err) {
        console.error('getDevices failed:', err);
      }

      try {
        unsubscribe = await subscribeDevices((devices) => {
          if (!cancelled) setDevices(devices);
        });
      } catch (err) {
        console.error('subscribeDevices failed:', err);
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
