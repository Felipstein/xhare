const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;

export function isValidIp(value: string): boolean {
  return IPV4_PATTERN.test(value.trim());
}
