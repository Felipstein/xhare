import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function _DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold tracking-[-0.4px]', className)}
      {...props}
    />
  );
}
