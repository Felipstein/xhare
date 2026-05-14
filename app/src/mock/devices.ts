import type { Device } from '@/types/Device';

export const mockDevices: Device[] = [
  { name: 'macbook-pro', address: '192.168.1.10', status: 'ONLINE' },
  { name: 'ipad-air', address: '192.168.1.11', status: 'ONLINE' },
  { name: 'imac-studio', address: '192.168.1.12', status: 'OFFLINE' },
  { name: 'iphone-15', address: '192.168.1.13', status: 'ONLINE' },
];
