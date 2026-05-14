import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback } from 'react';

/**
 * Window control actions for our custom Windows titlebar (where we set
 * decorations: false and need to draw min/max/close ourselves).
 */
export function useWindowControls() {
  const minimize = useCallback(() => {
    void getCurrentWindow().minimize();
  }, []);
  const toggleMaximize = useCallback(() => {
    void getCurrentWindow().toggleMaximize();
  }, []);
  const close = useCallback(() => {
    void getCurrentWindow().close();
  }, []);
  return { minimize, toggleMaximize, close };
}
