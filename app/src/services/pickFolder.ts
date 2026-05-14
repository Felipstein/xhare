/**
 * Open the OS native folder picker.
 *
 * Returns the selected path, or `null` if the user cancelled or
 * we are running outside Tauri (browser dev mode).
 */
export async function pickFolder(currentPath?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    // Browser dev fallback: keep current value so we don't break the form.
    return null;
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const result = await open({
    directory: true,
    multiple: false,
    title: 'Selecionar pasta de destino',
    defaultPath: currentPath,
  });

  if (typeof result === 'string') return result;
  return null;
}
