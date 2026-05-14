import { PlusIcon, RefreshCcwIcon, WifiIcon } from 'lucide-react';

import { Loader } from '@/components/Loader';
import { NoWiFiLogo } from '@/components/NoWiFiLogo';
import { NewDeviceDialog } from '@/components/NewDeviceDialog';
import { reconnect } from '@/services/connection';
import { useConnectionStore } from '@/stores/connectionStore';
import { useDevicesStore } from '@/stores/devicesStore';

import { DeviceItem } from './DeviceItem';

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

export function DeviceList() {
  const devices = useDevicesStore((s) => s.devices);
  const connection = useConnectionStore((s) => s.status);
  const isRetrying = connection === 'CONNECTING';

  const showList = connection === 'CONNECTED' && devices.length > 0;
  const showEmptyState = connection === 'CONNECTED' && devices.length === 0;

  return (
    <aside className="w-40 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/40">
      {showList ? (
        <ul className="flex-1 flex flex-col overflow-y-auto pt-1">
          {devices.map((device) => (
            <DeviceItem key={device.address} device={device} />
          ))}
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
