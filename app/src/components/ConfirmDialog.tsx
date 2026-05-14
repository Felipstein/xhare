import { AlertDialog } from './AlertDialog';
import { Button } from './Button';

import type { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<{
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}>;

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  children,
}: Props) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>

      <AlertDialog.Content>
        <div className="flex flex-col gap-2">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
        </div>

        <footer className="flex justify-end gap-2 pt-2">
          <AlertDialog.Cancel asChild>
            <Button variant="text">{cancelLabel}</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              onClick={onConfirm}
              className={destructive ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25' : ''}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
