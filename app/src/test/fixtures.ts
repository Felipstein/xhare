import type { Device } from '@/types/Device';
import type { SharedFile } from '@/types/SharedFile';

export const sampleDevices: Device[] = [
  {
    id: 'self:macbook-pro._xhare._tcp.local.',
    name: 'macbook-pro',
    address: '192.168.1.10',
    status: 'ONLINE',
    isSelf: true,
  },
  {
    id: 'mdns:ipad-air._xhare._tcp.local.',
    name: 'ipad-air',
    address: '192.168.1.11',
    status: 'ONLINE',
    isSelf: false,
  },
  {
    id: 'lan:192.168.1.12',
    name: 'imac-studio',
    address: '192.168.1.12',
    status: 'OFFLINE',
    isSelf: false,
  },
  {
    id: 'mdns:iphone-15._xhare._tcp.local.',
    name: 'iphone-15',
    address: '192.168.1.13',
    status: 'ONLINE',
    isSelf: false,
  },
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
