import { useDevicesStore } from '@/stores/devicesStore';
import { useFilesStore } from '@/stores/filesStore';

import {
  discardCachedFile,
  openCachedFile,
  saveCachedFile as saveCachedRust,
  sendFile as sendFileRust,
  showCachedFile,
  type SentFile,
} from './transfer';

import type { SharedFile } from '@/types/SharedFile';

function inferKind(name: string): SharedFile['kind'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video';
  return 'file';
}

function onlinePeerAddresses(): string[] {
  return useDevicesStore
    .getState()
    .devices.filter((d) => !d.isSelf && d.status === 'ONLINE')
    .map((d) => d.address);
}

/**
 * Dispatches a file to every currently-online peer. Adds an optimistic
 * `sending` row to the store; the real status is then driven by Rust events
 * (see useTransferSubscription).
 */
export async function sendFromPath(sourcePath: string): Promise<SentFile | null> {
  const peers = onlinePeerAddresses();
  if (peers.length === 0) return null;

  const sent = await sendFileRust(sourcePath, peers);
  const file: SharedFile = {
    id: sent.id,
    name: sent.name,
    size: sent.size,
    kind: inferKind(sent.name),
    extension: sent.name.includes('.') ? sent.name.split('.').pop() : undefined,
    from: 'você',
    sentAt: new Date(),
    status: 'sending',
    progress: 0,
    deliveredTo: [],
    failedTo: [],
    isRead: true,
    isPinned: false,
  };
  useFilesStore.getState().addFile(file);
  return sent;
}

export async function resendFile(file: SharedFile): Promise<void> {
  if (!file.cachedPath) return;
  const peers = onlinePeerAddresses();
  if (peers.length === 0) return;
  useFilesStore.getState().updateFile(file.id, { status: 'sending', progress: 0 });
  await sendFileRust(file.cachedPath, peers);
}

export async function discardFile(id: string): Promise<void> {
  try {
    await discardCachedFile(id);
  } catch (err) {
    console.warn('discardCachedFile:', err);
  }
  useFilesStore.getState().removeFile(id);
}

export async function openFile(file: SharedFile): Promise<void> {
  if (!file.cachedPath) return;
  await openCachedFile(file.id, file.name);
  useFilesStore.getState().markRead(file.id);
}

export async function showInFolder(file: SharedFile): Promise<void> {
  if (!file.cachedPath) return;
  await showCachedFile(file.id, file.name);
}

export async function saveFile(
  file: SharedFile,
  destinationDir: string,
): Promise<string | null> {
  if (!file.cachedPath) return null;
  const finalPath = await saveCachedRust(file.id, file.name, destinationDir);
  useFilesStore.getState().updateFile(file.id, { cachedPath: finalPath });
  useFilesStore.getState().markRead(file.id);
  return finalPath;
}

export async function copyFile(_file: SharedFile): Promise<void> {
  // V3.1 — write image to clipboard via tauri-plugin-clipboard-manager
}

export async function cancelTransfer(id: string): Promise<void> {
  // V3.1 — wire to Rust cancellation flag
  useFilesStore.getState().updateFile(id, { status: 'error' });
}
