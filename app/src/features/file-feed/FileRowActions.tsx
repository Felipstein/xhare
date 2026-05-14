import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  RefreshCcwIcon,
  XIcon,
} from 'lucide-react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePlatform } from '@/hooks/usePlatform';
import { cn } from '@/utils/cn';

import type { SharedFile } from '@/types/SharedFile';
import type { ComponentProps, ReactNode } from 'react';

type IconButtonProps = ComponentProps<'button'> & {
  label: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
};

function IconButton({ label, children, tone = 'default', className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center size-7 rounded-md transition-colors',
        '[&_svg]:size-4',
        'disabled:cursor-default disabled:hover:bg-transparent',
        {
          'text-zinc-400 hover:text-white hover:bg-zinc-700': tone === 'default',
          'text-red-400 hover:text-red-300 hover:bg-red-500/10': tone === 'danger',
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type ReceivedActionsProps = {
  file: SharedFile;
  onSave: () => void;
  onOpen: () => void;
  onCopy: () => void;
  onShowInFolder: () => void;
  onDiscard: () => void;
};

export function ReceivedActions({
  file,
  onSave,
  onOpen,
  onCopy,
  onShowInFolder,
  onDiscard,
}: ReceivedActionsProps) {
  const platform = usePlatform();
  const revealLabel = platform === 'windows' ? 'Mostrar no Explorer' : 'Mostrar no Finder';
  const isSaved = Boolean(file.savedPath);

  return (
    <div className="flex items-center gap-0.5">
      {isSaved ? (
        <IconButton label="Já salvo" disabled className="!text-green-400">
          <CheckIcon />
        </IconButton>
      ) : (
        <IconButton label="Salvar" onClick={onSave}>
          <DownloadIcon />
        </IconButton>
      )}
      <IconButton label="Abrir" onClick={onOpen}>
        <ExternalLinkIcon />
      </IconButton>
      <IconButton label="Copiar" onClick={onCopy}>
        <CopyIcon />
      </IconButton>
      <IconButton label={revealLabel} onClick={onShowInFolder}>
        <FolderOpenIcon />
      </IconButton>

      <ConfirmDialog
        title="Descartar arquivo?"
        description={
          <>
            <span className="font-medium text-zinc-200">{file.name}</span> será removido do cache
            local. Você não terá mais acesso a este arquivo.
          </>
        }
        confirmLabel="Descartar"
        destructive
        onConfirm={onDiscard}
      >
        <IconButton label="Descartar" tone="danger">
          <XIcon />
        </IconButton>
      </ConfirmDialog>
    </div>
  );
}

type SentActionsProps = {
  file: SharedFile;
  onResend: () => void;
  onRemove: () => void;
};

export function SentActions({ file, onResend, onRemove }: SentActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onResend}
        className="inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
      >
        <RefreshCcwIcon className="size-3.5" />
        Reenviar
      </button>

      <ConfirmDialog
        title="Remover envio?"
        description={
          <>
            <span className="font-medium text-zinc-200">{file.name}</span> será removido da sua
            lista. Os dispositivos que já receberam mantêm a cópia deles.
          </>
        }
        confirmLabel="Remover"
        destructive
        onConfirm={onRemove}
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <XIcon className="size-3.5" />
          Remover
        </button>
      </ConfirmDialog>
    </div>
  );
}

type ErrorActionsProps = {
  file: SharedFile;
  onRetry: () => void;
  onRemove: () => void;
};

export function ErrorActions({ file, onRetry, onRemove }: ErrorActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="px-2 py-0.5 text-[10px] font-semibold rounded text-red-400 bg-red-500/10 border border-red-500/30">
        Falhou
      </span>
      <IconButton label="Tentar novamente" onClick={onRetry}>
        <RefreshCcwIcon />
      </IconButton>
      <ConfirmDialog
        title="Remover envio?"
        description={
          <>
            <span className="font-medium text-zinc-200">{file.name}</span> será removido da
            lista.
          </>
        }
        confirmLabel="Remover"
        destructive
        onConfirm={onRemove}
      >
        <IconButton label="Remover" tone="danger">
          <XIcon />
        </IconButton>
      </ConfirmDialog>
    </div>
  );
}

type RowActionsProps = {
  file: SharedFile;
  onSave: (file: SharedFile) => void;
  onOpen: (file: SharedFile) => void;
  onCopy: (file: SharedFile) => void;
  onShowInFolder: (file: SharedFile) => void;
  onDiscard: (file: SharedFile) => void;
  onResend: (file: SharedFile) => void;
  onRemove: (file: SharedFile) => void;
  onRetry: (file: SharedFile) => void;
};

export function FileRowActions({
  file,
  onSave,
  onOpen,
  onCopy,
  onShowInFolder,
  onDiscard,
  onResend,
  onRemove,
  onRetry,
}: RowActionsProps) {
  if (file.status === 'error') {
    return (
      <ErrorActions
        file={file}
        onRetry={() => onRetry(file)}
        onRemove={() => onRemove(file)}
      />
    );
  }

  if (file.status === 'received') {
    return (
      <ReceivedActions
        file={file}
        onSave={() => onSave(file)}
        onOpen={() => onOpen(file)}
        onCopy={() => onCopy(file)}
        onShowInFolder={() => onShowInFolder(file)}
        onDiscard={() => onDiscard(file)}
      />
    );
  }

  if (file.status === 'sent') {
    return <SentActions file={file} onResend={() => onResend(file)} onRemove={() => onRemove(file)} />;
  }

  return null;
}
