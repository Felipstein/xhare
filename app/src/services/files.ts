import { notify, notifyError } from '@/components/Toast';
import { useDevicesStore } from '@/stores/devicesStore';
import { useFilesStore } from '@/stores/filesStore';

import {
  copyPathsToClipboard,
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

/**
 * Save every selected received file into `destinationDir`. Outgoing files are
 * skipped (no cache to copy from). Returns the count of files actually saved.
 */
export async function saveManyFiles(files: SharedFile[], destinationDir: string): Promise<number> {
  const targets = files.filter((f) => f.cachedPath && !f.savedPath);
  if (targets.length === 0) return 0;
  let saved = 0;
  for (const f of targets) {
    try {
      if (!f.cachedPath) continue;
      const finalPath = await saveCachedRust(f.cachedPath, f.name, destinationDir);
      useFilesStore.getState().updateFile(f.id, { savedPath: finalPath });
      useFilesStore.getState().markRead(f.id);
      saved += 1;
    } catch (err) {
      console.error('saveManyFiles: failed for', f.name, err);
    }
  }
  notify({
    title:
      saved === targets.length
        ? `${saved} arquivo(s) salvo(s)`
        : `${saved}/${targets.length} arquivo(s) salvo(s)`,
  });
  return saved;
}

/**
 * Remove every selected file. Received files have their cache cleaned; outgoing
 * files are removed from the feed only (the source on disk is untouched).
 */
export async function removeManyFiles(files: SharedFile[]): Promise<void> {
  for (const f of files) {
    if (f.cachedPath) {
      try {
        await discardCachedFile(f.id);
      } catch (err) {
        console.warn('discardCachedFile:', err);
      }
    }
    useFilesStore.getState().removeFile(f.id);
  }
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

export async function saveFile(file: SharedFile, destinationDir: string): Promise<string | null> {
  if (!file.cachedPath) return null;
  try {
    const finalPath = await saveCachedRust(file.cachedPath, file.name, destinationDir);
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
    await copyPathsToClipboard([path]);
    notify({ title: `${file.name} copiado` });
  } catch (err) {
    console.error('copyFile:', err);
    notifyError('Não foi possível copiar');
  }
}

/**
 * Copy every selected file as a real OS file reference. Paste in Finder /
 * Explorer drops the files; paste in chat apps attaches them where supported.
 */
export async function copyManyFiles(files: SharedFile[]): Promise<number> {
  const paths = files.map((f) => effectivePath(f)).filter((p): p is string => Boolean(p));
  if (paths.length === 0) {
    notifyError('Nenhum arquivo selecionado tem caminho disponível');
    return 0;
  }
  try {
    await copyPathsToClipboard(paths);
    notify({
      title: paths.length === 1 ? `${files[0].name} copiado` : `${paths.length} arquivos copiados`,
    });
    return paths.length;
  } catch (err) {
    console.error('copyManyFiles:', err);
    notifyError('Não foi possível copiar');
    return 0;
  }
}
