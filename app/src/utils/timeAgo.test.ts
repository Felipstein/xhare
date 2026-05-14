import { describe, it, expect } from 'vitest';

import { timeAgo } from './timeAgo';

const NOW = new Date('2026-05-14T12:00:00Z');

describe('timeAgo', () => {
  it('returns "agora" for diffs under 5s', () => {
    expect(timeAgo(new Date(NOW.getTime() - 2_000), NOW)).toBe('agora');
  });

  it('returns seconds for diffs under 1 minute', () => {
    expect(timeAgo(new Date(NOW.getTime() - 30_000), NOW)).toBe('30s atrás');
  });

  it('returns minutes for diffs under 1 hour', () => {
    expect(timeAgo(new Date(NOW.getTime() - 2 * 60_000), NOW)).toBe('2m atrás');
  });

  it('returns hours for diffs under 1 day', () => {
    expect(timeAgo(new Date(NOW.getTime() - 3 * 60 * 60_000), NOW)).toBe('3h atrás');
  });

  it('returns days for diffs over 1 day', () => {
    expect(timeAgo(new Date(NOW.getTime() - 2 * 24 * 60 * 60_000), NOW)).toBe('2d atrás');
  });
});
