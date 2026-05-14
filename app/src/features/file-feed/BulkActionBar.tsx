import { DownloadIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/Button';
import { notifyError } from '@/components/Toast';
import { removeManyFiles, saveManyFiles } from '@/services/files';
import { useFilesStore } from '@/stores/filesStore';
import { useSettingsStore } from '@/stores/settingsStore';

export function BulkActionBar() {
  const selectedIds = useFilesStore((s) => s.selectedIds);
  const files = useFilesStore((s) => s.files);
  const clearSelection = useFilesStore((s) => s.clearSelection);
  const downloadFolder = useSettingsStore((s) => s.downloadFolder);

  useEffect(() => {
    if (selectedIds.length === 0) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds.length, clearSelection]);

  if (selectedIds.length === 0) return null;

  const selected = files.filter((f) => selectedIds.includes(f.id));
  const savable = selected.filter((f) => f.cachedPath && !f.savedPath);

  const onSave = async (): Promise<void> => {
    if (!downloadFolder) {
      notifyError('Defina a pasta de download nas configurações');
      return;
    }
    if (savable.length === 0) {
      notifyError('Nenhum arquivo selecionado pode ser salvo');
      return;
    }
    await saveManyFiles(selected, downloadFolder);
    clearSelection();
  };

  const onDelete = async (): Promise<void> => {
    await removeManyFiles(selected);
    clearSelection();
  };

  return (
    <div
      role="toolbar"
      aria-label="Ações em massa"
      className="absolute left-1/2 bottom-6 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-zinc-700 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in-0"
    >
      <span className="text-sm text-zinc-200 tabular-nums whitespace-nowrap pl-1">
        {selectedIds.length} selecionado{selectedIds.length === 1 ? '' : 's'}
      </span>
      <span aria-hidden className="h-5 w-px bg-zinc-700" />
      <Button
        type="button"
        variant="text"
        onClick={() => void onSave()}
        disabled={savable.length === 0}
      >
        <DownloadIcon className="size-4" />
        Salvar
      </Button>
      <Button type="button" variant="text" onClick={() => void onDelete()}>
        <Trash2Icon className="size-4" />
        Apagar
      </Button>
      <span aria-hidden className="h-5 w-px bg-zinc-700" />
      <button
        type="button"
        onClick={clearSelection}
        aria-label="Limpar seleção"
        className="size-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
