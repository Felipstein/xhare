import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { sendFromPath } from '@/services/files';

/**
 * Hook into Tauri's native drag-drop event. Fires when the user drops
 * files anywhere on the window. We forward each path to the Rust sender.
 *
 * Returns the current drag state for the visual overlay.
 */
export function useNativeDragDrop(begin: () => void, end: () => void): void {
  useEffect(() => {
    const win = getCurrentWindow();
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      unsubscribe = await win.onDragDropEvent((event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          begin();
          return;
        }
        if (event.payload.type === 'leave') {
          end();
          return;
        }
        if (event.payload.type === 'drop') {
          end();
          const paths = (event.payload.paths ?? []) as string[];
          for (const path of paths) {
            void sendFromPath(path);
          }
        }
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [begin, end]);
}
