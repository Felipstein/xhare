import { open } from '@tauri-apps/plugin-dialog';

/**
 * Open the OS native folder picker. Returns the selected path, or `null`
 * if the user cancelled.
 */
export async function pickFolder(currentPath?: string): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: 'Selecionar pasta de destino',
    defaultPath: currentPath,
  });
  if (typeof result === 'string') return result;
  return null;
}
