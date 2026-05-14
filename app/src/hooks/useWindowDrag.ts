import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback } from 'react';

import type { MouseEvent } from 'react';

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [role="button"]';

/**
 * Returns props that, when spread onto an element, make it drag the Tauri window.
 *
 * `startDragging()` must be called SYNCHRONOUSLY from the mousedown handler —
 * no `await` before it. macOS WebKit only treats the mousedown as a window
 * drag gesture if the call happens in the same event tick. A dynamic
 * `import()` before calling startDragging breaks this and the drag silently
 * no-ops when the window is already focused. That's why `getCurrentWindow` is
 * imported statically at module top.
 *
 * Interactive children (button/input/label/etc.) are excluded so they remain
 * clickable. Double-click toggles maximize.
 */
export function useWindowDrag() {
  const onMouseDown = useCallback((e: MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;

    const win = getCurrentWindow();
    if (e.detail === 2) {
      void win.toggleMaximize();
      return;
    }
    void win.startDragging();
  }, []);

  return { onMouseDown };
}
