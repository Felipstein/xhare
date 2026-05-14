import { useState } from 'react';
import { ChevronDownIcon, PlusIcon, RefreshCcwIcon, WifiIcon } from 'lucide-react';

import { Collapsible } from '@/components/Collapsible';
import { Loader } from '@/components/Loader';
import { NoWiFiLogo } from '@/components/NoWiFiLogo';
import { NewDeviceDialog } from '@/components/NewDeviceDialog';
import { reconnect } from '@/services/connection';
import { useConnectionStore } from '@/stores/connectionStore';
import { useDevicesStore } from '@/stores/devicesStore';
import { cn } from '@/utils/cn';

import { DeviceItem } from './DeviceItem';

import type { Device } from '@/types/Device';

function SidebarHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 pt-3 pb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
      {children}
    </span>
  );
}

function ConnectingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
      <Loader className="text-amber-400" />
      <span className="text-sm text-zinc-400">Conectando…</span>
    </div>
  );
}

function DisconnectedState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
      <NoWiFiLogo />
      <span className="text-sm text-red-400">Sem conexão</span>
    </div>
  );
}

function EmptyDevicesState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex items-center justify-center rounded-full size-10 bg-zinc-800">
        <WifiIcon className="size-5 text-zinc-500" />
      </div>
      <span className="text-xs text-zinc-500 leading-snug">
        Nenhum dispositivo
        <br />
        conectado
      </span>
    </div>
  );
}

function partition(devices: Device[]): { online: Device[]; offline: Device[] } {
  const online: Device[] = [];
  const offline: Device[] = [];
  for (const d of devices) {
    if (d.status === 'ONLINE') online.push(d);
    else offline.push(d);
  }
  return { online, offline };
}

export function DeviceList() {
  const devices = useDevicesStore((s) => s.devices);
  const connection = useConnectionStore((s) => s.status);
  const isRetrying = connection === 'CONNECTING';
  const [offlinesOpen, setOfflinesOpen] = useState(true);

  const showList = connection === 'CONNECTED' && devices.length > 0;
  const showEmptyState = connection === 'CONNECTED' && devices.length === 0;
  const { online, offline } = partition(devices);

  return (
    <aside className="w-44 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/40">
      {showList ? (
        <ul className="flex-1 flex flex-col overflow-y-auto pt-1">
          {online.map((device) => (
            <DeviceItem key={device.id} device={device} />
          ))}

          {offline.length > 0 && (
            <li className="mt-1">
              <Collapsible.Root open={offlinesOpen} onOpenChange={setOfflinesOpen}>
                <Collapsible.Trigger asChild>
                  <button
                    type="button"
                    className="group w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase hover:text-zinc-300 transition-colors"
                  >
                    <ChevronDownIcon
                      className={cn(
                        'size-3 transition-transform',
                        !offlinesOpen && '-rotate-90',
                      )}
                    />
                    <span>Offlines ({offline.length})</span>
                    <span className="flex-1 border-t border-zinc-800 ml-2" />
                  </button>
                </Collapsible.Trigger>
                <Collapsible.Content className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                  <ul>
                    {offline.map((device) => (
                      <DeviceItem key={device.id} device={device} />
                    ))}
                  </ul>
                </Collapsible.Content>
              </Collapsible.Root>
            </li>
          )}
        </ul>
      ) : (
        <div className="flex-1 flex flex-col">
          <SidebarHeader>Dispositivos</SidebarHeader>
          {connection === 'CONNECTING' && <ConnectingState />}
          {connection === 'DISCONNECTED' && <DisconnectedState />}
          {showEmptyState && <EmptyDevicesState />}
        </div>
      )}

      {connection !== 'DISCONNECTED' ? (
        <NewDeviceDialog>
          <button
            type="button"
            disabled={connection === 'CONNECTING'}
            className="border-t border-zinc-800 py-3 flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:bg-blue-500/5 hover:text-blue-300 transition-colors disabled:pointer-events-none disabled:opacity-40"
          >
            <PlusIcon className="size-3.5" />
            Adicionar por IP
          </button>
        </NewDeviceDialog>
      ) : (
        <button
          type="button"
          onClick={() => void reconnect()}
          disabled={isRetrying}
          className="border-t border-zinc-800 py-3 flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:bg-blue-500/5 hover:text-blue-300 transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <RefreshCcwIcon className="size-3.5" />
          Tentar novamente
        </button>
      )}
    </aside>
  );
}
