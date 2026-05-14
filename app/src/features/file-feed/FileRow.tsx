import { ArrowUpIcon, CheckIcon, Loader2Icon } from 'lucide-react';

import { Tooltip } from '@/components/Tooltip';
import { cn } from '@/utils/cn';
import { formatSize, formatSpeed } from '@/utils/formatSize';
import { humanFileType } from '@/utils/fileType';
import { timeAgo } from '@/utils/timeAgo';
import { useDevicesStore } from '@/stores/devicesStore';
import { useFilesStore } from '@/stores/filesStore';

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

type IconCellProps = {
  file: SharedFile;
  isSelected: boolean;
  isSelectionActive: boolean;
  canSelect: boolean;
};

function FileIconOrCheckbox({ file, isSelected, isSelectionActive, canSelect }: IconCellProps) {
  const toggleSelect = useFilesStore((s) => s.toggleSelect);
  // The cell is 40px square. When the row is hovered (or any row is already
  // selected), the file icon fades out and a checkbox appears in its place.
  // Both are absolutely positioned in a relative wrapper so the column never
  // jitters in width.
  const showCheckboxBase = isSelected || isSelectionActive;
  return (
    <div className="relative size-10 shrink-0">
      <div
        className={cn(
          'absolute inset-0 transition-opacity',
          showCheckboxBase ? 'opacity-0' : canSelect ? 'group-hover/row:opacity-0' : '',
        )}
      >
        <FileIcon file={file} />
      </div>
      {canSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(file.id);
          }}
          aria-label={isSelected ? 'Desmarcar' : 'Marcar'}
          aria-pressed={isSelected}
          className={cn(
            'absolute inset-0 rounded-md flex items-center justify-center transition-opacity cursor-pointer',
            isSelected
              ? 'bg-blue-500 text-white border border-blue-500 opacity-100'
              : showCheckboxBase
                ? 'bg-zinc-700/50 text-zinc-400 border border-zinc-600 opacity-100 hover:bg-zinc-600 hover:text-zinc-200'
                : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600 opacity-0 group-hover/row:opacity-100 hover:bg-zinc-600 hover:text-zinc-200',
          )}
        >
          <CheckIcon className="size-5" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

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

  const device = devices.find(
    (d) => d.name === file.from || (file.fromAddress && d.address === file.fromAddress),
  );
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
  const isSelected = useFilesStore((s) => s.selectedIds.includes(file.id));
  const isSelectionActive = useFilesStore((s) => s.selectedIds.length > 0);
  const toggleSelect = useFilesStore((s) => s.toggleSelect);
  const isSaved = Boolean(file.savedPath);
  const isUnread =
    !file.isRead && !isSaved && (file.status === 'received' || file.status === 'error');
  const isZipping = file.status === 'zipping';
  const isTransferring = file.status === 'sending' || file.status === 'receiving';
  const showProgress = isTransferring && typeof file.progress === 'number';
  const hasHoverActions =
    !isSelectionActive &&
    !showProgress &&
    !isZipping &&
    (file.status === 'received' || file.status === 'sent');
  const canSelect = !isTransferring && !isZipping;
  // A click anywhere on the row body toggles selection. Clicks on action
  // buttons, the checkbox, or hover-overlay buttons are ignored here because
  // they are real <button> elements — we let them handle their own click.
  // We also bail when the user is double-clicking (second click of a
  // double-click would otherwise toggle right back to the original state).
  const onRowClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!canSelect) return;
    if (e.detail > 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [data-no-row-click]')) return;
    toggleSelect(file.id);
  };

  return (
    <div
      role="listitem"
      data-status={file.status}
      data-unread={isUnread || undefined}
      data-saved={isSaved || undefined}
      data-selected={isSelected || undefined}
      onClick={onRowClick}
      onDoubleClick={() => !isSelectionActive && onActivate?.(file)}
      className={cn(
        'group/row relative border-b border-zinc-800/80 cursor-default transition-colors overflow-hidden',
        {
          'bg-zinc-800/50': isUnread && !isSelected,
          'hover:bg-zinc-800/30': !isUnread && !isSelected,
          'hover:bg-zinc-800/60': isUnread && !isSelected,
          'bg-blue-500/10 hover:bg-blue-500/15': isSelected,
          'opacity-50 hover:opacity-90': isSaved && !isSelected,
          'opacity-70': file.status === 'sent' && file.isRead && !isSaved && !isSelected,
          'cursor-pointer': canSelect,
        },
      )}
    >
      {isUnread && !isSelected && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500"
        />
      )}
      {isSelected && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-400"
        />
      )}

      <div className={cn('grid items-center gap-4 px-4 py-3', ROW_GRID)}>
        <FileIconOrCheckbox
          file={file}
          isSelected={isSelected}
          isSelectionActive={isSelectionActive}
          canSelect={canSelect}
        />

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
          {isTransferring || isZipping ? 'agora' : timeAgo(file.sentAt)}
        </span>

        <div className="min-w-0 flex justify-end items-center">
          {isZipping && (
            <div className="flex flex-col items-end gap-1 w-full max-w-[140px]">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-400 tabular-nums whitespace-nowrap">
                <Loader2Icon className="size-3 animate-spin" />
                Zipando · {Math.floor(file.progress ?? 0)}%
              </span>
              <ProgressBar value={file.progress ?? 0} variant="zip" />
            </div>
          )}

          {!isZipping && showProgress && (
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

          {!showProgress && !isZipping && file.status === 'error' && <FileRowActions {...props} />}
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
