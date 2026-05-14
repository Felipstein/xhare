import { useCallback, useState } from 'react';

/**
 * Drag-drop hook for V1 mocks.
 *
 * In V3 this hook will be replaced by Tauri's native window.onDragDropEvent listener,
 * which is the only reliable way to receive OS file drops in a Tauri webview.
 * The component API stays the same: { isDragging, onDragEnter, onDragLeave, onDrop }.
 */
export function useDragDrop() {
  const [isDragging, setIsDragging] = useState(false);

  const begin = useCallback(() => setIsDragging(true), []);
  const end = useCallback(() => setIsDragging(false), []);

  return {
    isDragging,
    begin,
    end,
  };
}
