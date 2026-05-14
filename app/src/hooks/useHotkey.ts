import { useEffect } from 'react';

type Modifier = 'ctrl' | 'meta' | 'alt' | 'shift';

type Options = {
  modifiers?: Modifier[];
  enabled?: boolean;
};

function modifiersMatch(e: KeyboardEvent, mods: Modifier[]): boolean {
  const required = new Set(mods);
  const ctrl = required.has('ctrl');
  const meta = required.has('meta');
  const alt = required.has('alt');
  const shift = required.has('shift');

  if (ctrl !== e.ctrlKey) return false;
  if (meta !== e.metaKey) return false;
  if (alt !== e.altKey) return false;
  if (shift !== e.shiftKey) return false;
  return true;
}

export function useHotkey(
  key: string,
  callback: (e: KeyboardEvent) => void,
  { modifiers = [], enabled = true }: Options = {},
): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (!modifiersMatch(e, modifiers)) return;
      callback(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, enabled, modifiers]);
}
