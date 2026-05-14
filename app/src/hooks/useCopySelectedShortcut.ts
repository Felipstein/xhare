import { useEffect } from 'react';

import { copyManyFiles } from '@/services/files';
import { useFilesStore } from '@/stores/filesStore';

/**
 * Cmd/Ctrl+C — copies the selected files to the OS clipboard as real file
 * references. Pasting in Finder/Explorer drops the actual files; pasting in
 * chat apps attaches them as images/videos when supported.
 *
 * Bailed out of when the user is typing or has no selection, so the chord
 * still works for normal text copy.
 */
export function useCopySelectedShortcut(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const isAccel = e.metaKey || e.ctrlKey;
      if (!isAccel || e.key.toLowerCase() !== 'c') return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;

      // If the user has a real text selection, leave the chord alone.
      const sel = window.getSelection?.();
      if (sel && !sel.isCollapsed && sel.toString().length > 0) return;

      const { selectedIds, files } = useFilesStore.getState();
      if (selectedIds.length === 0) return;
      const selected = files.filter((f) => selectedIds.includes(f.id));
      if (selected.length === 0) return;

      e.preventDefault();
      void copyManyFiles(selected);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
