import { MinusIcon, ScrollTextIcon, SettingsIcon, SquareIcon, XIcon } from 'lucide-react';

import { LogViewer } from '@/features/logs/LogViewer';
import { usePlatform } from '@/hooks/usePlatform';
import { useWindowControls } from '@/hooks/useWindowControls';
import { useWindowDrag } from '@/hooks/useWindowDrag';
import { cn } from '@/utils/cn';

import { LocalIpChip } from './LocalIpChip';
import { SettingsDialog } from './SettingsDialog';

type Props = {
  hint?: string;
};

function WindowsControls() {
  const { minimize, toggleMaximize, close } = useWindowControls();
  return (
    <div className="flex items-stretch h-full -mr-3 shrink-0">
      <button
        type="button"
        aria-label="Minimizar"
        onClick={minimize}
        className="inline-flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <MinusIcon className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Maximizar"
        onClick={toggleMaximize}
        className="inline-flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <SquareIcon className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Fechar"
        onClick={close}
        className="inline-flex items-center justify-center w-11 h-full text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

/**
 * Title bar.
 *
 * macOS: window has `decorations: true` + `titleBarStyle: "Overlay"` so the OS
 * renders rounded corners and the native, functional traffic lights at the
 * standard macOS coordinates. We leave `pl-20` of clearance for them.
 *
 * Windows: at runtime we call `set_decorations(false)` so the OS draws no
 * chrome — we render min/max/close ourselves here.
 */
export function TitleBar({ hint }: Props) {
  const platform = usePlatform();
  const isMac = platform === 'macos';
  const isWindows = platform === 'windows';
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

      <LogViewer>
        <button
          type="button"
          aria-label="Logs"
          className="inline-flex items-center justify-center size-7 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <ScrollTextIcon className="size-4" />
        </button>
      </LogViewer>

      <SettingsDialog>
        <button
          type="button"
          aria-label="Configurações"
          className="inline-flex items-center justify-center size-7 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <SettingsIcon className="size-4" />
        </button>
      </SettingsDialog>

      {isWindows && <WindowsControls />}
    </header>
  );
}
