import { useRef, useState } from 'react';

import { addDeviceByIp, probeDevice } from '@/services/devices';
import { isValidIp } from '@/utils/isValidIp';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { Input } from './Input';

import type { PropsWithChildren } from 'react';

export function NewDeviceDialog({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const nameTouchedRef = useRef(false);

  const trimmedAddress = address.trim();
  const isAddressValid = isValidIp(trimmedAddress);
  const showError = touched && address.length > 0 && !isAddressValid;
  const canSubmit = isAddressValid;

  const reset = (): void => {
    setAddress('');
    setName('');
    setTouched(false);
    setIsProbing(false);
    nameTouchedRef.current = false;
  };

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) reset();
  };

  const handleAddressBlur = async (): Promise<void> => {
    setTouched(true);
    if (!isAddressValid) return;
    if (nameTouchedRef.current && name.trim().length > 0) return;

    setIsProbing(true);
    try {
      const hostname = await probeDevice(trimmedAddress);
      if (hostname && !nameTouchedRef.current) {
        setName(hostname);
      }
    } finally {
      setIsProbing(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) {
      setTouched(true);
      return;
    }
    await addDeviceByIp({ address: trimmedAddress, name: name.trim() || undefined });
    handleOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Content className="flex flex-col gap-4 w-[95vw] max-w-[340px]">
        <Dialog.Title>Adicionar dispositivo</Dialog.Title>
        <Dialog.Description className="sr-only">
          Adicione um dispositivo manualmente pelo endereço IP local
        </Dialog.Description>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="device-address" className="font-medium text-xs text-zinc-400">
              Endereço IP
            </label>
            <Input
              id="device-address"
              autoFocus
              placeholder="192.168.1.100"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => void handleAddressBlur()}
              aria-invalid={showError || undefined}
            />
            {showError && <span className="text-xs text-red-400">Endereço IP inválido</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="device-name" className="font-medium text-xs text-zinc-400">
              Nome (opcional)
              {isProbing && <span className="ml-2 text-zinc-500 font-normal">buscando…</span>}
            </label>
            <Input
              id="device-name"
              placeholder="Laptop do trabalho"
              value={name}
              onChange={(e) => {
                nameTouchedRef.current = true;
                setName(e.target.value);
              }}
            />
          </div>

          <footer className="flex justify-end gap-2 pt-2">
            <Dialog.Close asChild>
              <Button variant="text">Cancelar</Button>
            </Dialog.Close>
            <Button type="submit" disabled={!canSubmit}>
              Conectar
            </Button>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
