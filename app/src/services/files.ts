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
  return file.savedPath ?? file.cachedPath;
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
  const source = effectivePath(file);
  if (!source) return;
  const peers = onlinePeerAddresses();
  if (peers.length === 0) {
    notifyError('Nenhum dispositivo conectado para reenviar');
    return;
  }
  useFilesStore.getState().updateFile(file.id, { status: 'sending', progress: 0 });
  await sendFileRust(source, peers);
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
