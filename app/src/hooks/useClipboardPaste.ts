import { useEffect } from 'react';

import { notify, notifyError } from '@/components/Toast';
import { sendFromPath } from '@/services/files';
import { readClipboardPaths, saveClipboardBlob } from '@/services/transfer';

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
};

function extFromMime(mime: string): string {
  return MIME_TO_EXT[mime] ?? mime.split('/').pop() ?? 'bin';
}

function timestampName(ext: string): string {
  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `clipboard-${stamp}.${ext}`;
}

function parseUriList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      if (!line.startsWith('file://')) return null;
      try {
        return decodeURIComponent(line.slice('file://'.length));
      } catch {
        return null;
      }
    })
    .filter((p): p is string => p !== null);
}

/**
 * Cmd/Ctrl+V handler at the document level.
 *
 * Strategy (in priority order):
 *  1. Ask Rust to read file paths from the OS clipboard. This is the only
 *     reliable source for real filenames when copying from Finder / Explorer —
 *     the WebKit DataTransfer often drops `text/uri-list` and gives us a File
 *     with an empty `.name`. Paths from here go straight to `sendFromPath`
 *     (which handles folders via auto-zip).
 *  2. Fall back to `text/uri-list` from the DataTransfer if Rust returns
 *     nothing (some apps populate URI list but not the system file list).
 *  3. Inline file blobs (screenshots, image data without a backing file). We
 *     skip File objects that look like directory stubs (size 0, empty type).
 *
 * Inline blobs only run when neither path source yielded anything, so we never
 * duplicate-send the same image twice (some copies put both a path *and* the
 * inline pixels on the clipboard).
 */
export function useClipboardPaste(): void {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // user is typing — leave the paste alone
      }
      const data = event.clipboardData;

      // Grab a synchronous snapshot of the inline items before we hand control
      // back to the event loop — DataTransfer becomes inert after the handler
      // returns, so we have to read `getData` and `getAsFile` now.
      const uriListRaw = data?.getData('text/uri-list') ?? '';
      const inlineBlobs: Array<{ name: string; blob: Blob }> = [];
      if (data) {
        for (const item of Array.from(data.items)) {
          if (item.kind !== 'file') continue;
          const file = item.getAsFile();
          if (!file) continue;
          if (file.size === 0 && file.type === '') continue;
          const name =
            file.name && file.name.length > 0
              ? file.name
              : timestampName(extFromMime(file.type || 'application/octet-stream'));
          inlineBlobs.push({ name, blob: file });
        }
      }

      // We don't yet know how many items there are — that depends on the Rust
      // call. Cancel the browser's default *only* if there's at least one
      // candidate source; otherwise let the normal paste behaviour through
      // (e.g. for pasting text into a future search input we don't have yet).
      const hasInlineSource = uriListRaw.length > 0 || inlineBlobs.length > 0;

      void (async () => {
        let paths: string[] = [];
        try {
          paths = await readClipboardPaths();
        } catch (err) {
          console.warn('readClipboardPaths failed, falling back:', err);
        }

        if (paths.length === 0) {
          paths = parseUriList(uriListRaw);
        }

        const useBlobs = paths.length === 0;
        const total = paths.length + (useBlobs ? inlineBlobs.length : 0);
        if (total === 0) return;

        notify({
          title: `Enviando ${total} item${total === 1 ? '' : 'ns'} da área de transferência…`,
        });

        for (const path of paths) {
          try {
            await sendFromPath(path);
          } catch (err) {
            console.error('paste send (path) failed:', err);
            notifyError(`Falha ao enviar ${path.split(/[\\/]/).pop() ?? path}`);
          }
        }
        if (useBlobs) {
          for (const { name, blob } of inlineBlobs) {
            try {
              const buffer = await blob.arrayBuffer();
              const path = await saveClipboardBlob(name, new Uint8Array(buffer));
              await sendFromPath(path);
            } catch (err) {
              console.error('paste send (blob) failed:', err);
              notifyError(`Falha ao enviar ${name}`);
            }
          }
        }
      })();

      // Prevent default only if it looks like a file paste — we don't want to
      // swallow text paste destined for inputs we may add later.
      if (hasInlineSource) {
        event.preventDefault();
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}
