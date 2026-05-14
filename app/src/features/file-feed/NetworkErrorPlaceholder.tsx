import { Button } from '@/components/Button';
import { NoWiFiLogo } from '@/components/NoWiFiLogo';
import { reconnect } from '@/services/connection';
import { useConnectionStore } from '@/stores/connectionStore';

import { RefreshCcwIcon } from 'lucide-react';

export function NetworkErrorPlaceholder() {
  const status = useConnectionStore((s) => s.status);
  const isRetrying = status === 'CONNECTING';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-5">
      <NoWiFiLogo className="size-16" />

      <div className="flex flex-col gap-1.5">
        <p className="font-medium tracking-tight text-zinc-100">
          Não foi possível conectar à rede local
        </p>
        <span className="text-sm text-zinc-500 max-w-[320px] leading-relaxed">
          Verifique sua conexão de rede e certifique-se de que está conectado à mesma rede dos
          outros dispositivos
        </span>
      </div>

      <Button onClick={() => void reconnect()} isLoading={isRetrying}>
        <RefreshCcwIcon />
        Tentar novamente
      </Button>
    </div>
  );
}
