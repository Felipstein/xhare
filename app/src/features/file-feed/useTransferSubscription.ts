import { useEffect } from 'react';

import { notify } from '@/components/Toast';
import { openFile, saveFile, showInFolder } from '@/services/files';
import { subscribeTransfer } from '@/services/transfer';
import { useFilesStore } from '@/stores/filesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { uniqueName } from '@/utils/uniqueName';

import type {
  CompletePayload,
  ErrorPayload,
  ProgressPayload,
  ReceivedFile,
  ZipCompletePayload,
  ZipProgressPayload,
  ZipStartPayload,
} from '@/services/transfer';
import type { SharedFile } from '@/types/SharedFile';

function inferKind(name: string): SharedFile['kind'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video';
  return 'file';
}

function inferExtension(name: string): string | undefined {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext && ext !== name ? ext : undefined;
}

export function useTransferSubscription(): void {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const onFileReceived = (received: ReceivedFile): void => {
      // Browser-style dedupe: if the feed already has a `notes.txt`, the new
      // arrival becomes `notes (1).txt`. Only the display name changes;
      // `cachedPath` keeps pointing at the real file on disk.
      const takenNames = new Set(useFilesStore.getState().files.map((f) => f.name));
      const displayName = uniqueName(received.name, takenNames);

      const file: SharedFile = {
        id: received.id,
        name: displayName,
        size: received.size,
        kind: inferKind(received.name),
        extension: inferExtension(received.name),
        from: received.from,
        fromAddress: received.fromAddress,
        sentAt: new Date(),
        status: 'received',
        isRead: false,
        isPinned: false,
        cachedPath: received.cachedPath,
      };
      useFilesStore.getState().addFile(file);

      const downloadFolder = useSettingsStore.getState().downloadFolder;
      const actions = [
        { label: 'Abrir', onClick: () => void openFile(file) },
        { label: 'Mostrar', onClick: () => void showInFolder(file) },
      ];
      if (downloadFolder) {
        actions.unshift({ label: 'Salvar', onClick: () => void saveFile(file, downloadFolder) });
      }
      notify({
        title: `${received.from} enviou ${displayName}`,
        actions,
      });
    };

    const onProgress = (p: ProgressPayload): void => {
      const percent = p.total > 0 ? Math.floor((p.bytes / p.total) * 100) : 0;
      const status: SharedFile['status'] = p.direction === 'send' ? 'sending' : 'receiving';
      useFilesStore.getState().updateFile(p.id, {
        status,
        progress: percent,
      });
    };

    const onComplete = (c: CompletePayload): void => {
      const finalStatus: SharedFile['status'] = c.direction === 'send' ? 'sent' : 'received';
      useFilesStore.getState().updateFile(c.id, {
        status: finalStatus,
        progress: undefined,
        speedBps: undefined,
      });
    };

    const onError = (e: ErrorPayload): void => {
      console.error('transfer-error', e);
      useFilesStore.getState().updateFile(e.id, { status: 'error' });
    };

    const onZipStart = (e: ZipStartPayload): void => {
      // Repaint the row as a ZIP from the start: name, extension and kind are
      // updated so the icon shows the amber ZIP badge while compression runs.
      useFilesStore.getState().updateFile(e.id, {
        status: 'zipping',
        name: e.name,
        extension: 'zip',
        kind: 'file',
        size: e.total,
        progress: 0,
      });
    };

    const onZipProgress = (e: ZipProgressPayload): void => {
      const percent = e.total > 0 ? Math.floor((e.bytes / e.total) * 100) : 0;
      useFilesStore.getState().updateFile(e.id, { status: 'zipping', progress: percent });
    };

    const onZipComplete = (e: ZipCompletePayload): void => {
      // Flip to 'sending' now; transfer-progress events will update the bar.
      useFilesStore.getState().updateFile(e.id, {
        status: 'sending',
        name: e.name,
        size: e.size,
        progress: 0,
      });
    };

    void (async () => {
      try {
        unsubscribe = await subscribeTransfer({
          onFileReceived,
          onProgress,
          onComplete,
          onError,
          onZipStart,
          onZipProgress,
          onZipComplete,
        });
      } catch (err) {
        console.error('subscribeTransfer failed:', err);
      }
      if (cancelled && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);
}
