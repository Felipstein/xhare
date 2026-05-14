import type { SharedFile } from '@/types/SharedFile';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const now = Date.now();

export const mockFiles: SharedFile[] = [
  {
    id: 'f1',
    name: 'design-mockup.jpg',
    size: 2.4 * 1024 * 1024,
    kind: 'image',
    extension: 'jpg',
    thumbnailUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="%23ec4899"/><stop offset="1" stop-color="%23f59e0b"/></linearGradient></defs><rect width="80" height="80" fill="url(%23g)"/></svg>',
      ),
    from: 'ipad-air',
    sentAt: new Date(now - 2 * MINUTE),
    status: 'received',
    isRead: false,
    isPinned: false,
  },
  {
    id: 'f2',
    name: 'relatorio-Q2.pdf',
    size: 856 * 1024,
    kind: 'file',
    extension: 'pdf',
    from: 'macbook-pro',
    sentAt: new Date(now - 5 * MINUTE),
    status: 'received',
    isRead: false,
    isPinned: false,
  },
  {
    id: 'f3',
    name: 'backup-projeto.zip',
    size: 12.3 * 1024 * 1024,
    kind: 'file',
    extension: 'zip',
    from: 'você',
    sentAt: new Date(now - HOUR),
    status: 'sent',
    deliveredTo: ['macbook-pro', 'ipad-air'],
    failedTo: ['imac-studio'],
    isRead: true,
    isPinned: false,
  },
  {
    id: 'f4',
    name: 'projeto-assets/',
    size: 145 * 1024 * 1024,
    kind: 'folder',
    from: 'macbook-pro',
    sentAt: new Date(now - 2 * HOUR),
    status: 'received',
    isRead: true,
    isPinned: false,
  },
];
