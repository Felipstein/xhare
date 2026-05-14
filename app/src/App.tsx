import { useEffect } from 'react';

import { TitleBar } from '@/components/TitleBar';
import { Tooltip } from '@/components/Tooltip';
import { DeviceList } from '@/features/devices/DeviceList';
import { useDeviceSubscription } from '@/features/devices/useDeviceSubscription';
import { FileFeed } from '@/features/file-feed/FileFeed';
import { useDragDrop } from '@/hooks/useDragDrop';
import { bootstrapSettings } from '@/stores/settingsStore';

export function App() {
  const { isDragging, begin, end } = useDragDrop();

  useDeviceSubscription();

  useEffect(() => {
    void bootstrapSettings();
  }, []);

  // V1 only: simulate Tauri's native onDragDropEvent using DOM events on the root
  // so designers can preview the drag-over state in `pnpm dev`. In V3 this useEffect
  // is replaced by getCurrentWindow().onDragDropEvent (native).
  useEffect(() => {
    const onEnter = (e: DragEvent): void => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      begin();
    };
    const onOver = (e: DragEvent): void => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
    };
    const onLeave = (e: DragEvent): void => {
      if (e.relatedTarget) return;
      end();
    };
    const onDrop = (e: DragEvent): void => {
      e.preventDefault();
      end();
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [begin, end]);

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
