import { useState } from 'react';

import { SettingsForm } from '@/features/settings/SettingsForm';

import { Dialog } from './Dialog';

import type { PropsWithChildren } from 'react';

export function SettingsDialog({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Content className="flex flex-col gap-5 w-[95vw] max-w-[440px]">
        <Dialog.Title>Configurações</Dialog.Title>
        <Dialog.Description className="sr-only">
          Configurações do aplicativo Xhare
        </Dialog.Description>

        <SettingsForm onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Dialog.Content>
    </Dialog.Root>
  );
}
