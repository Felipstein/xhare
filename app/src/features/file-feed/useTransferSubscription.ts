import { useEffect } from 'react';

import { subscribeTransfer } from '@/services/transfer';
import { useFilesStore } from '@/stores/filesStore';

import type {
  CompletePayload,
  ErrorPayload,
  ProgressPayload,
  ReceivedFile,
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
      const file: SharedFile = {
        id: received.id,
        name: received.name,
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

    void (async () => {
      try {
        unsubscribe = await subscribeTransfer({
          onFileReceived,
          onProgress,
          onComplete,
          onError,
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
