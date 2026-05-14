import { WifiOffIcon } from 'lucide-react';

import { cn } from '../utils/cn';

import type { ComponentProps } from 'react';

export function NoWiFiLogo({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'size-10 flex items-center justify-center rounded-full bg-red-500/15',
        className,
      )}
      {...props}
    >
      <WifiOffIcon className="text-red-500 size-1/2" />
    </div>
  );
}
