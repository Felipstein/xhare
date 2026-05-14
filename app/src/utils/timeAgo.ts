const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();

  if (diff < 5_000) return 'agora';
  if (diff < MINUTE) return `${Math.floor(diff / 1000)}s atrás`;
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m atrás`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h atrás`;

  return `${Math.floor(diff / DAY)}d atrás`;
}
