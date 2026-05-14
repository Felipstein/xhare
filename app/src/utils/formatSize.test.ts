import { describe, it, expect } from 'vitest';

import { formatSize, formatSpeed } from './formatSize';

describe('formatSize', () => {
  it('returns bytes for small values', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(500)).toBe('500 B');
  });

  it('returns KB with 1 decimal for < 10 KB and integer for larger', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(2.5 * 1024)).toBe('2.5 KB');
    expect(formatSize(856 * 1024)).toBe('856 KB');
  });

  it('returns MB for megabyte values', () => {
    expect(formatSize(2.4 * 1024 * 1024)).toBe('2.4 MB');
    expect(formatSize(145 * 1024 * 1024)).toBe('145 MB');
  });

  it('returns GB for gigabyte values', () => {
    expect(formatSize(2.5 * 1024 ** 3)).toBe('2.5 GB');
  });

  it('handles negative and NaN safely', () => {
    expect(formatSize(-1)).toBe('0 B');
    expect(formatSize(Number.NaN)).toBe('0 B');
  });
});

describe('formatSpeed', () => {
  it('appends /s suffix', () => {
    expect(formatSpeed(1024 * 1024)).toBe('1.0 MB/s');
  });
});
