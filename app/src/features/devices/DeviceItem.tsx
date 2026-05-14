import { Tooltip } from '@/components/Tooltip';
import { cn } from '@/utils/cn';

import type { Device } from '@/types/Device';

type Props = {
  device: Device;
};

export function DeviceItem({ device }: Props) {
  const isOnline = device.status === 'ONLINE';

  return (
    <li
      data-self={device.isSelf || undefined}
      className="flex items-center gap-2.5 px-3 py-2 cursor-default"
    >
      <span
        aria-hidden
        title={
          device.isSelf ? 'Você' : isOnline ? 'Online — Xhare aberto' : 'Offline — sem Xhare aberto'
        }
        className={cn(
          'size-2 rounded-full shrink-0',
          device.isSelf ? 'bg-blue-500' : isOnline ? 'bg-green-500' : 'bg-zinc-600',
        )}
      />
      <div className="flex flex-col min-w-0 flex-1 leading-tight">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span
              className={cn(
                'truncate text-sm tracking-tight',
                device.isSelf
                  ? 'text-blue-300 font-medium'
                  : isOnline
                    ? 'text-zinc-200'
                    : 'text-zinc-500',
              )}
            >
              {device.name}
              {device.isSelf && (
                <span className="ml-1 text-[10px] font-normal text-blue-400/80">(você)</span>
              )}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content side="right" align="start">
            {device.name}
          </Tooltip.Content>
        </Tooltip.Root>
        <span className="truncate text-[10px] tabular-nums font-mono text-zinc-500">
          {device.address}
        </span>
      </div>
    </li>
  );
}
