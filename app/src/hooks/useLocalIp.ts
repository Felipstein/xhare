import { useEffect, useState } from 'react';

import { getLocalIp } from '@/services/network';

export function useLocalIp(): string | null {
  const [ip, setIp] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getLocalIp();
        if (!cancelled) setIp(result);
      } catch {
        if (!cancelled) setIp(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ip;
}
