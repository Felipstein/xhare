import { FileIcon as FileIconLucide, FileTextIcon, FolderIcon } from 'lucide-react';

import { cn } from '@/utils/cn';

import type { SharedFile } from '@/types/SharedFile';

type Props = {
  file: SharedFile;
  className?: string;
};

const BADGE_BY_EXT: Record<string, { label: string; bg: string }> = {
  pdf: { label: 'PDF', bg: 'bg-red-500/15 text-red-400 border-red-500/30' },
  zip: { label: 'ZIP', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  rar: { label: 'RAR', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  doc: { label: 'DOC', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  docx: { label: 'DOC', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  xls: { label: 'XLS', bg: 'bg-green-500/15 text-green-400 border-green-500/30' },
  xlsx: { label: 'XLS', bg: 'bg-green-500/15 text-green-400 border-green-500/30' },
};

export function FileIcon({ file, className }: Props) {
  if (file.kind === 'folder') {
    return (
      <div
        className={cn(
          'shrink-0 size-10 rounded-md flex items-center justify-center bg-zinc-700/50 text-zinc-400',
          className,
        )}
      >
        <FolderIcon className="size-5" />
      </div>
    );
  }

  if ((file.kind === 'image' || file.kind === 'video') && file.thumbnailUrl) {
    return (
      <div
        className={cn(
          'shrink-0 size-10 rounded-md overflow-hidden bg-zinc-800',
          className,
        )}
      >
        <img
          src={file.thumbnailUrl}
          alt=""
          className="size-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  const ext = file.extension?.toLowerCase();
  const badge = ext ? BADGE_BY_EXT[ext] : undefined;

  if (badge) {
    return (
      <div
        className={cn(
          'shrink-0 size-10 rounded-md flex flex-col items-center justify-center border text-[9px] font-bold tracking-wider',
          badge.bg,
          className,
        )}
      >
        <FileTextIcon className="size-4 mb-0.5 opacity-80" />
        <span>{badge.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'shrink-0 size-10 rounded-md flex items-center justify-center bg-zinc-700/50 text-zinc-400',
        className,
      )}
    >
      <FileIconLucide className="size-5" />
    </div>
  );
}
