import { UploadCloudIcon } from 'lucide-react';

import { cn } from '@/utils/cn';

type Props = {
  isVisible: boolean;
};

export function DragOverlay({ isVisible }: Props) {
  return (
    <div
      aria-hidden={!isVisible}
      data-visible={isVisible || undefined}
      className={cn(
        'pointer-events-none absolute inset-0 z-20',
        'flex items-center justify-center',
        'transition-opacity duration-150',
        'bg-blue-500/5 backdrop-blur-[2px]',
        'border-2 border-dashed border-blue-500/60 rounded-md m-2',
        isVisible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="flex flex-col items-center gap-3 text-blue-300">
        <UploadCloudIcon className="size-10" />
        <span className="text-sm font-medium">Solte os arquivos para compartilhar</span>
      </div>
    </div>
  );
}
