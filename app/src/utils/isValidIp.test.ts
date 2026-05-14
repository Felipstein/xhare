import { describe, it, expect } from 'vitest';

import { isValidIp } from './isValidIp';

describe('isValidIp', () => {
  it.each(['192.168.1.1', '10.0.0.1', '127.0.0.1', '255.255.255.255', '0.0.0.0'])(
    'accepts valid IPv4 %s',
    (ip) => {
      expect(isValidIp(ip)).toBe(true);
    },
  );

  it.each(['256.0.0.1', '1.2.3', '1.2.3.4.5', 'abc', '', ' ', '192.168.1.', '192.168.1.999'])(
    'rejects invalid IP %s',
    (ip) => {
      expect(isValidIp(ip)).toBe(false);
    },
  );

  it('trims whitespace before validating', () => {
    expect(isValidIp('  192.168.1.1  ')).toBe(true);
  });
});
