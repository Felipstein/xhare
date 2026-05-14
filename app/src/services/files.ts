import { notify, notifyError } from '@/components/Toast';
import { useDevicesStore } from '@/stores/devicesStore';
import { useFilesStore } from '@/stores/filesStore';

import {
  discardCachedFile,
  openPath,
  revealPath,
  saveCachedFile as saveCachedRust,
  sendFile as sendFileRust,
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

function effectivePath(file: SharedFile): string | undefined {
  // Outgoing file: prefer its original source. Incoming: cache or saved copy.
  return file.sourcePath ?? file.savedPath ?? file.cachedPath;
}

function revealLabel(): string {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('win') ? 'Mostrar no Explorer' : 'Mostrar no Finder';
}

export async function sendFromPath(sourcePath: string): Promise<SentFile | null> {
  const peers = onlinePeerAddresses();
  if (peers.length === 0) {
    notifyError('Nenhum dispositivo conectado para receber');
    return null;
  }
  // Generate id on the frontend so we can register the file in the store
  // BEFORE Rust spawns its send thread. Otherwise the thread can emit
  // transfer-progress / transfer-complete before addFile runs, leaving the
  // row stuck at 0%.
  const fileId = crypto.randomUUID();
  const name = sourcePath.split(/[\\/]/).pop() ?? sourcePath;
  const file: SharedFile = {
    id: fileId,
    name,
    size: 0,
    kind: inferKind(name),
    extension: name.includes('.') ? name.split('.').pop() : undefined,
    from: 'você',
    sentAt: new Date(),
    status: 'sending',
    progress: 0,
    deliveredTo: [],
    failedTo: [],
    isRead: true,
    isPinned: false,
    sourcePath,
  };
  useFilesStore.getState().addFile(file);
  try {
    const sent = await sendFileRust(fileId, sourcePath, peers);
    // Rust knows the real size after stat — update so the UI shows it.
    useFilesStore.getState().updateFile(fileId, { size: sent.size, name: sent.name });
    return sent;
  } catch (err) {
    useFilesStore.getState().updateFile(fileId, { status: 'error' });
    throw err;
  }
}

export async function resendFile(file: SharedFile): Promise<void> {
  const source = effectivePath(file);
  if (!source) return;
  const peers = onlinePeerAddresses();
  if (peers.length === 0) {
    notifyError('Nenhum dispositivo conectado para reenviar');
    return;
  }
  // Fresh id on the frontend, registered before Rust starts emitting events.
  const newId = crypto.randomUUID();
  useFilesStore.getState().replaceFile(file.id, {
    ...file,
    id: newId,
    status: 'sending',
    progress: 0,
    sentAt: new Date(),
    isRead: true,
    deliveredTo: [],
    failedTo: [],
  });
  try {
    await sendFileRust(newId, source, peers);
  } catch (err) {
    useFilesStore.getState().updateFile(newId, { status: 'error' });
    throw err;
  }
}

export async function discardFile(file: SharedFile): Promise<void> {
  try {
    await discardCachedFile(file.id);
  } catch (err) {
    console.warn('discardCachedFile:', err);
  }
  useFilesStore.getState().removeFile(file.id);
}

export async function openFile(file: SharedFile): Promise<void> {
  const path = effectivePath(file);
  if (!path) return;
  await openPath(path);
  useFilesStore.getState().markRead(file.id);
}

export async function showInFolder(file: SharedFile): Promise<void> {
  const path = effectivePath(file);
  if (!path) return;
  await revealPath(path);
}

export async function saveFile(
  file: SharedFile,
  destinationDir: string,
): Promise<string | null> {
  if (!file.cachedPath) return null;
  try {
    const finalPath = await saveCachedRust(file.id, file.name, destinationDir);
    useFilesStore.getState().updateFile(file.id, { savedPath: finalPath });
    useFilesStore.getState().markRead(file.id);
    const savedFile: SharedFile = { ...file, savedPath: finalPath };
    notify({
      title: `${file.name} salvo`,
      actions: [
        { label: 'Abrir', onClick: () => void openFile(savedFile) },
        { label: revealLabel(), onClick: () => void showInFolder(savedFile) },
      ],
    });
    return finalPath;
  } catch (err) {
    notifyError(`Falha ao salvar ${file.name}`);
    console.error('saveFile:', err);
    return null;
  }
}

export async function copyFile(file: SharedFile): Promise<void> {
  const path = effectivePath(file);
  if (!path) return;
  try {
    await navigator.clipboard.writeText(path);
    notify({ title: 'Caminho copiado' });
  } catch {
    notifyError('Não foi possível copiar');
  }
}

export async function cancelTransfer(id: string): Promise<void> {
  // V3.1 — wire to Rust cancellation flag
  useFilesStore.getState().updateFile(id, { status: 'error' });
}
