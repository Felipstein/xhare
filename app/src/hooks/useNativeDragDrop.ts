import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { sendFromPath } from '@/services/files';

/**
 * Hook into Tauri's native drag-drop event. Forwards each dropped path
 * to the Rust sender.
 *
 * StrictMode hazard: `onDragDropEvent` returns a Promise that resolves with
 * the unsubscribe fn. If we just stored it after `await`, StrictMode's
 * double-effect would attach a second listener before the first's unsubscribe
 * lands — both fire and each drop sends the file twice. The fix is to track a
 * `cancelled` flag and immediately tear down a listener that landed after the
 * cleanup ran.
 */
export function useNativeDragDrop(begin: () => void, end: () => void): void {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    getCurrentWindow()
      .onDragDropEvent((event) => {
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
      })
      .then((unsub) => {
        if (cancelled) {
          unsub();
        } else {
          unsubscribe = unsub;
        }
      })
      .catch((err) => {
        console.error('onDragDropEvent failed:', err);
      });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [begin, end]);
}
