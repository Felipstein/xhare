import { cn } from '@/utils/cn';

import type { Device } from '@/types/Device';

type Props = {
  device: Device;
};

export function DeviceItem({ device }: Props) {
  const isOnline = device.status === 'ONLINE';

  return (
    <li className="flex items-center gap-2.5 px-3 py-2 cursor-default">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full shrink-0',
          isOnline ? 'bg-green-500' : 'bg-zinc-500',
        )}
      />
      <span className="truncate text-sm tracking-tight text-zinc-200">{device.name}</span>
    </li>
  );
}
