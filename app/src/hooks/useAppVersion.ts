import { getVersion } from '@tauri-apps/api/app';
import { useEffect, useState } from 'react';

/**
 * Read the app version from `tauri.conf.json` at runtime. Returns an empty
 * string until the async call resolves, so callers can short-circuit rendering
 * with `version && …`.
 */
export function useAppVersion(): string {
  const [version, setVersion] = useState('');
  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch((err) => console.warn('getVersion failed:', err));
  }, []);
  return version;
}
