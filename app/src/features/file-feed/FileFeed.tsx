import { useConnectionStore } from '@/stores/connectionStore';
import { useDevicesStore } from '@/stores/devicesStore';

import { BulkActionBar } from './BulkActionBar';
import { DragOverlay } from './DragOverlay';
import { EmptyFiles } from './EmptyFiles';
import { FileRow } from './FileRow';
import { NetworkErrorPlaceholder } from './NetworkErrorPlaceholder';
import { NoDevicesPlaceholder } from './NoDevicesPlaceholder';
import { useFiles } from './useFiles';

type Props = {
  isDragging?: boolean;
};

export function FileFeed({ isDragging = false }: Props) {
  const { files, handlers } = useFiles();
  const devicesCount = useDevicesStore((s) => s.devices.length);
  const connection = useConnectionStore((s) => s.status);

  const showNetworkError = connection === 'DISCONNECTED';
  const showNoDevices = !showNetworkError && devicesCount === 0;
  const showEmptyFiles = !showNetworkError && !showNoDevices && files.length === 0;
  const showList = !showNetworkError && !showNoDevices && files.length > 0;

  return (
    <section className="relative flex-1 flex flex-col overflow-hidden">
      {showNetworkError && <NetworkErrorPlaceholder />}
      {showNoDevices && <NoDevicesPlaceholder />}
      {showEmptyFiles && <EmptyFiles />}

      {showList && (
        <div role="list" className="flex-1 overflow-y-auto">
          {files.map((file) => (
            <FileRow key={file.id} file={file} {...handlers} />
          ))}
        </div>
      )}

      <BulkActionBar />

      <DragOverlay isVisible={isDragging && !showNetworkError} />
    </section>
  );
}
