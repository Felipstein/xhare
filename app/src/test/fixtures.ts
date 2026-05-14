import type { Device } from '@/types/Device';
import type { SharedFile } from '@/types/SharedFile';

export const sampleDevices: Device[] = [
  { name: 'macbook-pro', address: '192.168.1.10', status: 'ONLINE' },
  { name: 'ipad-air', address: '192.168.1.11', status: 'ONLINE' },
  { name: 'imac-studio', address: '192.168.1.12', status: 'OFFLINE' },
  { name: 'iphone-15', address: '192.168.1.13', status: 'ONLINE' },
];

export const sampleFile = (overrides: Partial<SharedFile> = {}): SharedFile => ({
  id: overrides.id ?? 'f1',
  name: overrides.name ?? 'design-mockup.jpg',
  size: overrides.size ?? 2.4 * 1024 * 1024,
  kind: overrides.kind ?? 'image',
  from: overrides.from ?? 'ipad-air',
  sentAt: overrides.sentAt ?? new Date(Date.now() - 2 * 60_000),
  status: overrides.status ?? 'received',
  isRead: overrides.isRead ?? false,
  isPinned: overrides.isPinned ?? false,
  ...overrides,
});
