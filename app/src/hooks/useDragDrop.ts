import { useCallback, useState } from 'react';

/**
 * UI-level drag state. `useNativeDragDrop` is the actual file-drop event
 * source (Tauri's `onDragDropEvent`); this hook just tracks "is the user
 * currently hovering with a drag?" so the overlay can show/hide.
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
