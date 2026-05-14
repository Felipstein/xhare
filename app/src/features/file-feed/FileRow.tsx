import { ArrowUpIcon, CheckIcon } from 'lucide-react';

import { Tooltip } from '@/components/Tooltip';
import { cn } from '@/utils/cn';
import { formatSize, formatSpeed } from '@/utils/formatSize';
import { humanFileType } from '@/utils/fileType';
import { timeAgo } from '@/utils/timeAgo';
import { useDevicesStore } from '@/stores/devicesStore';

import { FileIcon } from './FileIcon';
import { FileRowActions } from './FileRowActions';
import { ProgressBar } from './ProgressBar';
import { ROW_GRID } from './rowGrid';

import type { SharedFile } from '@/types/SharedFile';

type Handlers = {
  onSave: (file: SharedFile) => void;
  onOpen: (file: SharedFile) => void;
  onCopy: (file: SharedFile) => void;
  onShowInFolder: (file: SharedFile) => void;
  onDiscard: (file: SharedFile) => void;
  onResend: (file: SharedFile) => void;
  onRemove: (file: SharedFile) => void;
  onRetry: (file: SharedFile) => void;
  onActivate?: (file: SharedFile) => void;
};

type Props = Handlers & {
  file: SharedFile;
};

function FromCell({ file }: { file: SharedFile }) {
  const devices = useDevicesStore((s) => s.devices);

  if (file.from === 'você') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-400 whitespace-nowrap">
        <ArrowUpIcon className="size-3" />
        você
      </span>
    );
  }

  const device = devices.find((d) => d.name === file.from);
  const isOnline = device?.status === 'ONLINE';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 whitespace-nowrap min-w-0">
      <span className="text-zinc-500">de:</span>
      <span
        aria-hidden
        className={cn('size-2 rounded-full shrink-0', isOnline ? 'bg-green-500' : 'bg-zinc-500')}
      />
      <span className="truncate">{file.from}</span>
    </span>
  );
}

function FileSubtitle({ file }: { file: SharedFile }) {
  if (file.kind === 'folder') {
    return (
      <span className="text-[11px] text-zinc-500 truncate">
        23 arquivos · {formatSize(file.size)}
      </span>
    );
  }
  return (
    <span className="text-[11px] text-zinc-500 truncate">{humanFileType(file)}</span>
  );
}

export function FileRow(props: Props) {
  const { file, onActivate } = props;
  const isSaved = Boolean(file.savedPath);
  const isUnread =
    !file.isRead && !isSaved && (file.status === 'received' || file.status === 'error');
  const isTransferring = file.status === 'sending' || file.status === 'receiving';
  const showProgress = isTransferring && typeof file.progress === 'number';
  const hasHoverActions =
    !showProgress && (file.status === 'received' || file.status === 'sent');

  return (
    <div
      role="listitem"
      data-status={file.status}
      data-unread={isUnread || undefined}
      data-saved={isSaved || undefined}
      onDoubleClick={() => onActivate?.(file)}
      className={cn(
        'group/row relative border-b border-zinc-800/80 cursor-default transition-colors overflow-hidden',
        {
          'bg-zinc-800/50': isUnread,
          'hover:bg-zinc-800/30': !isUnread,
          'hover:bg-zinc-800/60': isUnread,
          'opacity-50 hover:opacity-90': isSaved,
          'opacity-70': file.status === 'sent' && file.isRead && !isSaved,
        },
      )}
    >
      {isUnread && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500"
        />
      )}

      <div className={cn('grid items-center gap-4 px-4 py-3', ROW_GRID)}>
        <FileIcon file={file} />

        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'truncate text-sm font-medium tracking-tight',
                isUnread ? 'text-white' : 'text-zinc-200',
              )}
              title={file.name}
            >
              {file.name}
            </span>
            {isSaved && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span className="inline-flex shrink-0 size-3.5 rounded-full bg-green-500/15 items-center justify-center">
                    <CheckIcon className="size-2.5 text-green-400" />
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side="top">
                  Já salvo em {file.savedPath}
                </Tooltip.Content>
              </Tooltip.Root>
            )}
          </div>
          <FileSubtitle file={file} />
        </div>

        <span className="text-xs text-zinc-400 whitespace-nowrap tabular-nums text-right">
          {file.kind === 'folder' ? '' : formatSize(file.size)}
        </span>

        <FromCell file={file} />

        <span className="text-xs text-zinc-500 whitespace-nowrap text-right">
          {isTransferring ? 'agora' : timeAgo(file.sentAt)}
        </span>

        <div className="min-w-0 flex justify-end items-center">
          {showProgress && (
            <div className="flex flex-col items-end gap-1 w-full max-w-[140px]">
              <span className="text-[10px] tabular-nums text-zinc-400 whitespace-nowrap">
                {Math.floor(file.progress ?? 0)}%
                {file.status === 'sending' && file.speedBps
                  ? ` · ${formatSpeed(file.speedBps)}`
                  : ''}
              </span>
              <ProgressBar
                value={file.progress ?? 0}
                variant={file.status === 'sending' ? 'send' : 'receive'}
              />
            </div>
          )}

          {!showProgress && file.status === 'error' && <FileRowActions {...props} />}
        </div>
      </div>

      {hasHoverActions && <HoverOverlay {...props} />}
    </div>
  );
}

function HoverOverlay(props: Props) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-y-0 right-0',
        'flex items-center pl-24 pr-3',
        'opacity-0 group-hover/row:opacity-100 transition-opacity duration-150',
        'bg-gradient-to-l from-zinc-800 via-zinc-800/95 via-60% to-transparent',
      )}
    >
      <div className="pointer-events-auto ml-auto">
        <FileRowActions {...props} />
      </div>
    </div>
  );
}
