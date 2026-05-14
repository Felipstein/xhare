import { beforeEach, describe, it, expect } from 'vitest';

import { sampleFile } from '@/test/fixtures';

import { useFilesStore } from './filesStore';

describe('filesStore', () => {
  beforeEach(() => {
    useFilesStore.getState().reset();
  });

  it('starts empty', () => {
    expect(useFilesStore.getState().files).toEqual([]);
  });

  it('addFile prepends a file', () => {
    useFilesStore.getState().addFile(sampleFile({ id: 'a' }));
    useFilesStore.getState().addFile(sampleFile({ id: 'b' }));
    expect(useFilesStore.getState().files[0].id).toBe('b');
    expect(useFilesStore.getState().files).toHaveLength(2);
  });

  it('updateFile patches by id', () => {
    useFilesStore.getState().addFile(sampleFile({ id: 'a' }));
    useFilesStore.getState().updateFile('a', { isRead: true });
    expect(useFilesStore.getState().files[0].isRead).toBe(true);
  });

  it('removeFile removes by id and drops it from selectedIds', () => {
    useFilesStore.getState().addFile(sampleFile({ id: 'a' }));
    useFilesStore.getState().toggleSelect('a');
    useFilesStore.getState().removeFile('a');
    expect(useFilesStore.getState().files).toHaveLength(0);
    expect(useFilesStore.getState().selectedIds).toEqual([]);
  });

  it('markRead flips a single file', () => {
    useFilesStore.getState().addFile(sampleFile({ id: 'a', isRead: false }));
    useFilesStore.getState().markRead('a');
    expect(useFilesStore.getState().files[0].isRead).toBe(true);
  });

  it('markAllRead flips every file', () => {
    useFilesStore
      .getState()
      .setFiles([sampleFile({ id: 'a', isRead: false }), sampleFile({ id: 'b', isRead: false })]);
    useFilesStore.getState().markAllRead();
    expect(useFilesStore.getState().files.every((f) => f.isRead)).toBe(true);
  });
});
