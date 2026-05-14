import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';

import { useFilesStore } from '@/stores/filesStore';

import type { SharedFile } from '@/types/SharedFile';

function isUnread(f: SharedFile): boolean {
  if (f.isRead) return false;
  if (f.savedPath) return false;
  return f.status === 'received' || f.status === 'error';
}

/**
 * Keeps the OS tray badge in sync with the unread-file count. On macOS the
 * count appears as a tiny label next to the menu-bar icon; on Windows it
 * updates the tray tooltip (the system tray has no native badge).
 */
export function useUnreadBadge(): void {
  const files = useFilesStore((s) => s.files);

  useEffect(() => {
    const count = files.filter(isUnread).length;
    void invoke('set_unread_count', { count }).catch((err) => {
      console.warn('set_unread_count failed:', err);
    });
  }, [files]);
}
