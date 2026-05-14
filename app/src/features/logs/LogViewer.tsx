import { FolderOpenIcon, RefreshCcwIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { getLogsDir, readLogLines, type LogLine } from '@/services/logs';
import { openPath } from '@/services/transfer';
import { cn } from '@/utils/cn';

import type { PropsWithChildren } from 'react';

const LEVEL_STYLE: Record<string, string> = {
  ERROR: 'text-red-400',
  WARN: 'text-amber-400',
  INFO: 'text-zinc-300',
  DEBUG: 'text-zinc-500',
  TRACE: 'text-zinc-600',
};

function formatTimestamp(raw: string): string {
  if (!raw) return '';
  // expect ISO-ish; show HH:MM:SS
  const match = raw.match(/T(\d{2}:\d{2}:\d{2})/);
  if (match) return match[1];
  return raw;
}

export function LogViewer({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await readLogLines(500);
      setLines(data);
    } catch (err) {
      console.error('readLogLines:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const interval = window.setInterval(refresh, 2000);
    return () => window.clearInterval(interval);
  }, [open, refresh]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return lines
      .filter((line) => {
        if (filter !== 'ALL' && line.level !== filter) return false;
        if (s && !line.message.toLowerCase().includes(s)) return false;
        return true;
      })
      .reverse();
  }, [lines, filter, search]);

  const openLogsFolder = async (): Promise<void> => {
    try {
      const dir = await getLogsDir();
      if (dir) await openPath(dir);
    } catch (err) {
      console.error('open logs dir:', err);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Content className="flex flex-col gap-3 w-[95vw] max-w-[760px] h-[80vh] p-0! overflow-hidden focus:outline-none">
        <header className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-700/60">
          <Dialog.Title>Logs</Dialog.Title>
          <Dialog.Description className="sr-only">
            Eventos da aplicação em tempo real
          </Dialog.Description>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="text"
              onClick={() => void refresh()}
              disabled={isLoading}
            >
              <RefreshCcwIcon className={cn(isLoading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button type="button" onClick={() => void openLogsFolder()}>
              <FolderOpenIcon />
              Abrir pasta de logs
            </Button>
          </div>
        </header>

        <div className="px-5 flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-md p-0.5">
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilter(lvl)}
                className={cn(
                  'text-[11px] font-medium px-2.5 py-1 rounded transition-colors',
                  filter === lvl ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                {lvl === 'ALL' ? 'Todos' : lvl}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar mensagem…"
            className="flex-1 h-8 px-3 text-xs bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <span className="text-[11px] tabular-nums text-zinc-500">
            {filtered.length} / {lines.length}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 font-mono">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
              {isLoading ? 'Carregando…' : 'Nenhum log para mostrar'}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((line, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[64px_56px_minmax(0,1fr)] gap-3 items-baseline py-1 px-2 rounded text-[11px] leading-relaxed hover:bg-zinc-800/50"
                >
                  <span className="text-zinc-500 tabular-nums">
                    {formatTimestamp(line.timestamp)}
                  </span>
                  <span className={cn('font-semibold', LEVEL_STYLE[line.level] ?? 'text-zinc-400')}>
                    {line.level}
                  </span>
                  <span className="text-zinc-300 break-words">{line.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
