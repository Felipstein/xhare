export type Platform = 'macos' | 'windows' | 'linux';

export function detectPlatform(userAgent: string = navigator.userAgent): Platform {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('win')) return 'windows';
  return 'linux';
}

export function usePlatform(): Platform {
  return detectPlatform();
}
