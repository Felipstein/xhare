import { SettingsIcon } from 'lucide-react';

import { cn } from '@/utils/cn';
import { usePlatform } from '@/hooks/usePlatform';
import { useWindowDrag } from '@/hooks/useWindowDrag';

import { LocalIpChip } from './LocalIpChip';
import { SettingsDialog } from './SettingsDialog';

type Props = {
  hint?: string;
};

/**
 * Title bar.
 *
 * macOS: window has `decorations: true` + `titleBarStyle: "Overlay"` so the OS
 * renders rounded corners and the native, functional traffic lights at the
 * standard macOS coordinates. We leave `pl-20` of clearance for them.
 *
 * Windows: native chrome (decorations: true) draws min/max/close above us.
 *
 * Drag: handled manually by `useWindowDrag()` via mousedown — calling
 * `startDragging()` on the Tauri window. Tauri 2's built-in handler doesn't
 * reliably fire when the window is already focused, so we own this.
 */
export function TitleBar({ hint }: Props) {
  const platform = usePlatform();
  const isMac = platform === 'macos';
  const drag = useWindowDrag();

  return (
    <header
      {...drag}
      className={cn(
        'shrink-0 h-9 flex items-center gap-3 border-b border-zinc-800 select-none',
        isMac ? 'pl-20 pr-3' : 'px-3',
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 h-full">
        <span className="text-sm font-semibold tracking-tight text-zinc-100">Xhare</span>
        {hint && (
          <span className="px-2 py-0.5 text-[11px] rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            {hint}
          </span>
        )}
      </div>

      <LocalIpChip />

      <SettingsDialog>
        <button
          type="button"
          aria-label="Configurações"
          className="inline-flex items-center justify-center size-7 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <SettingsIcon className="size-4" />
        </button>
      </SettingsDialog>
    </header>
  );
}
