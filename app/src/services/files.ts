import { useFilesStore } from '@/stores/filesStore';

import type { SharedFile } from '@/types/SharedFile';

let counter = 0;

function makeId(): string {
  counter += 1;
  return `f-${Date.now()}-${counter}`;
}

export type SendFileInput = {
  name: string;
  size: number;
  kind?: SharedFile['kind'];
  extension?: string;
};

export async function sendFile(input: SendFileInput): Promise<SharedFile> {
  const store = useFilesStore.getState();
  const id = makeId();

  const file: SharedFile = {
    id,
    name: input.name,
    size: input.size,
    kind: input.kind ?? 'file',
    extension: input.extension,
    from: 'você',
    sentAt: new Date(),
    status: 'sending',
    progress: 0,
    speedBps: 0,
    deliveredTo: [],
    failedTo: [],
    isRead: true,
    isPinned: false,
  };

  store.addFile(file);

  simulateProgress(id, 'sending');
  return file;
}

export async function resendFile(id: string): Promise<void> {
  const { updateFile } = useFilesStore.getState();
  updateFile(id, { status: 'sending', progress: 0, speedBps: 0 });
  simulateProgress(id, 'sending');
}

export async function cancelTransfer(id: string): Promise<void> {
  const { updateFile } = useFilesStore.getState();
  updateFile(id, { status: 'error' });
}

export async function discardFile(id: string): Promise<void> {
  useFilesStore.getState().removeFile(id);
}

export async function openFile(id: string): Promise<void> {
  void id;
}

export async function showInFolder(id: string): Promise<void> {
  void id;
}

export async function saveFile(id: string): Promise<void> {
  useFilesStore.getState().updateFile(id, { cachedPath: '/saved/' + id });
}

export async function copyFile(id: string): Promise<void> {
  void id;
}

function simulateProgress(id: string, finalStatus: 'sending' | 'receiving'): void {
  const { updateFile } = useFilesStore.getState();
  let progress = 0;
  const tick = (): void => {
    progress += 5 + Math.random() * 10;
    if (progress >= 100) {
      updateFile(id, {
        progress: undefined,
        speedBps: undefined,
        status: finalStatus === 'sending' ? 'sent' : 'received',
      });
      return;
    }
    updateFile(id, {
      progress: Math.min(progress, 99),
      speedBps: Math.round((2 + Math.random() * 4) * 1024 * 1024),
    });
    setTimeout(tick, 250);
  };
  setTimeout(tick, 250);
}
