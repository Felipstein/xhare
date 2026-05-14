import { useEffect } from 'react';

import { useFilesStore } from '@/stores/filesStore';

import type { SharedFile } from '@/types/SharedFile';

function selectable(file: SharedFile): boolean {
  return file.status !== 'sending' && file.status !== 'receiving' && file.status !== 'zipping';
}

/**
 * Cmd/Ctrl+A — selects every selectable file in the feed. If everything that
 * could be selected already is, the shortcut clears the selection instead, so
 * the same chord works as a toggle.
 *
 * Ignored when the user is typing in an input/textarea so native "select all"
 * still works for those.
 */
export function useSelectAllShortcut(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const isAccel = e.metaKey || e.ctrlKey;
      if (!isAccel || e.key.toLowerCase() !== 'a') return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;

      const { files, selectedIds, setSelectedIds, clearSelection } = useFilesStore.getState();
      const eligible = files.filter(selectable);
      if (eligible.length === 0) return;

      e.preventDefault();
      const allSelected =
        selectedIds.length === eligible.length && eligible.every((f) => selectedIds.includes(f.id));
      if (allSelected) {
        clearSelection();
      } else {
        setSelectedIds(eligible.map((f) => f.id));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
