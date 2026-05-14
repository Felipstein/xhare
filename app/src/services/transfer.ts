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
  sourcePath: string,
  outputName: string,
  destinationDir: string,
): Promise<string> {
  return invoke<string>('save_cached_file', { sourcePath, outputName, destinationDir });
}

export function discardCachedFile(fileId: string): Promise<void> {
  return invoke('discard_cached_file', { fileId });
}

/** Open an absolute path in the user's default app. */
export function openPath(path: string): Promise<void> {
  return invoke('open_path', { path });
}

/** Persist clipboard bytes to a temp file and return the absolute path. */
export function saveClipboardBlob(name: string, bytes: Uint8Array): Promise<string> {
  return invoke<string>('save_clipboard_blob', { name, bytes: Array.from(bytes) });
}

/** Returns file paths from the OS clipboard (empty if it holds text/image). */
export function readClipboardPaths(): Promise<string[]> {
  return invoke<string[]>('read_clipboard_paths');
}

/** Write file references to the OS clipboard so paste drops actual files. */
export function copyPathsToClipboard(paths: string[]): Promise<void> {
  return invoke('copy_paths_to_clipboard', { paths });
}

/** Reveal a file in Finder (macOS) / Explorer (Windows) with the file highlighted. */
export function revealPath(path: string): Promise<void> {
  return invoke('reveal_path', { path });
}

export type ZipStartPayload = { id: string; name: string; total: number };
export type ZipProgressPayload = { id: string; bytes: number; total: number };
export type ZipCompletePayload = { id: string; name: string; size: number };

export type TransferHandlers = {
  onFileReceived: (file: ReceivedFile) => void;
  onProgress: (progress: ProgressPayload) => void;
  onComplete: (complete: CompletePayload) => void;
  onError: (error: ErrorPayload) => void;
  onZipStart: (event: ZipStartPayload) => void;
  onZipProgress: (event: ZipProgressPayload) => void;
  onZipComplete: (event: ZipCompletePayload) => void;
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
  const offZipStart = await listen<ZipStartPayload>('transfer-zip-start', (e) =>
    handlers.onZipStart(e.payload),
  );
  const offZipProgress = await listen<ZipProgressPayload>('transfer-zip-progress', (e) =>
    handlers.onZipProgress(e.payload),
  );
  const offZipComplete = await listen<ZipCompletePayload>('transfer-zip-complete', (e) =>
    handlers.onZipComplete(e.payload),
  );
  return () => {
    offReceived();
    offProgress();
    offComplete();
    offError();
    offZipStart();
    offZipProgress();
    offZipComplete();
  };
}
