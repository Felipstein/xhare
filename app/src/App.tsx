import { useEffect } from 'react';

import { TitleBar } from '@/components/TitleBar';
import { Tooltip } from '@/components/Tooltip';
import { DeviceList } from '@/features/devices/DeviceList';
import { useDeviceSubscription } from '@/features/devices/useDeviceSubscription';
import { FileFeed } from '@/features/file-feed/FileFeed';
import { useTransferSubscription } from '@/features/file-feed/useTransferSubscription';
import { useDragDrop } from '@/hooks/useDragDrop';
import { useNativeDragDrop } from '@/hooks/useNativeDragDrop';
import { bootstrapSettings } from '@/stores/settingsStore';

export function App() {
  const { isDragging, begin, end } = useDragDrop();

  useDeviceSubscription();
  useTransferSubscription();
  useNativeDragDrop(begin, end);

  useEffect(() => {
    void bootstrapSettings();
  }, []);

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="h-screen flex flex-col bg-zinc-900 text-zinc-100 overflow-hidden">
        <TitleBar hint={isDragging ? 'Solte arquivos aqui' : undefined} />

        <div className="flex-1 flex min-h-0">
          <DeviceList />
          <FileFeed isDragging={isDragging} />
        </div>
      </div>
    </Tooltip.Provider>
  );
}
