import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type SentFile = {
  id: string;
  name: string;
  size: number;
  from: string;
};

export type ReceivedFile = {
  id: string;
  name: string;
  size: number;
  from: string;
  fromAddress?: string;
  cachedPath: string;
};

export type TransferDirection = 'send' | 'receive';

export type ProgressPayload = {
  id: string;
  direction: TransferDirection;
  bytes: number;
  total: number;
};

export type CompletePayload = {
  id: string;
  direction: TransferDirection;
  peer: string | null;
};

export type ErrorPayload = {
  id: string;
  direction: TransferDirection;
  peer: string | null;
  message: string;
};

export type Unsubscribe = () => void;

export function sendFile(
  fileId: string,
  sourcePath: string,
  peers: string[],
): Promise<SentFile> {
  return invoke<SentFile>('send_file', { fileId, sourcePath, peers });
}

export function saveCachedFile(
  fileId: string,
  name: string,
  destinationDir: string,
): Promise<string> {
  return invoke<string>('save_cached_file', { fileId, name, destinationDir });
}

export function discardCachedFile(fileId: string): Promise<void> {
  return invoke('discard_cached_file', { fileId });
}

/** Open an absolute path in the user's default app. */
export function openPath(path: string): Promise<void> {
  return invoke('open_path', { path });
}

/** Reveal a file in Finder (macOS) / Explorer (Windows) with the file highlighted. */
export function revealPath(path: string): Promise<void> {
  return invoke('reveal_path', { path });
}

export type TransferHandlers = {
  onFileReceived: (file: ReceivedFile) => void;
  onProgress: (progress: ProgressPayload) => void;
  onComplete: (complete: CompletePayload) => void;
  onError: (error: ErrorPayload) => void;
};

export async function subscribeTransfer(handlers: TransferHandlers): Promise<Unsubscribe> {
  const offReceived = await listen<ReceivedFile>('file-received', (e) =>
    handlers.onFileReceived(e.payload),
  );
  const offProgress = await listen<ProgressPayload>('transfer-progress', (e) =>
    handlers.onProgress(e.payload),
  );
  const offComplete = await listen<CompletePayload>('transfer-complete', (e) =>
    handlers.onComplete(e.payload),
  );
  const offError = await listen<ErrorPayload>('transfer-error', (e) =>
    handlers.onError(e.payload),
  );
  return () => {
    offReceived();
    offProgress();
    offComplete();
    offError();
  };
}
