import { beforeEach, describe, it, expect } from 'vitest';

import { useFilesStore } from './filesStore';

import type { SharedFile } from '@/types/SharedFile';

const makeFile = (id: string, overrides: Partial<SharedFile> = {}): SharedFile => ({
  id,
  name: `${id}.txt`,
  size: 1024,
  kind: 'file',
  from: 'macbook-pro',
  sentAt: new Date(),
  status: 'received',
  isRead: false,
  isPinned: false,
  ...overrides,
});

describe('filesStore', () => {
  beforeEach(() => {
    useFilesStore.getState().reset();
  });

  it('seeds with mock files', () => {
    expect(useFilesStore.getState().files.length).toBeGreaterThan(0);
  });

  it('addFile prepends a file', () => {
    const { addFile } = useFilesStore.getState();
    const before = useFilesStore.getState().files.length;
    addFile(makeFile('new-1'));
    expect(useFilesStore.getState().files[0].id).toBe('new-1');
    expect(useFilesStore.getState().files).toHaveLength(before + 1);
  });

  it('updateFile patches by id', () => {
    const first = useFilesStore.getState().files[0];
    useFilesStore.getState().updateFile(first.id, { isRead: true });
    expect(useFilesStore.getState().files[0].isRead).toBe(true);
  });

  it('removeFile removes by id and clears selectedId when needed', () => {
    const first = useFilesStore.getState().files[0];
    useFilesStore.getState().select(first.id);
    useFilesStore.getState().removeFile(first.id);
    expect(useFilesStore.getState().files.find((f) => f.id === first.id)).toBeUndefined();
    expect(useFilesStore.getState().selectedId).toBeNull();
  });

  it('markRead flips a single file', () => {
    const unread = useFilesStore.getState().files.find((f) => !f.isRead);
    expect(unread).toBeDefined();
    useFilesStore.getState().markRead(unread!.id);
    const after = useFilesStore.getState().files.find((f) => f.id === unread!.id);
    expect(after?.isRead).toBe(true);
  });

  it('markAllRead flips every file', () => {
    useFilesStore.getState().markAllRead();
    expect(useFilesStore.getState().files.every((f) => f.isRead)).toBe(true);
  });
});
