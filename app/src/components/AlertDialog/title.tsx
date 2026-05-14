import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function _AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('text-base font-semibold tracking-tight text-zinc-100', className)}
      {...props}
    />
  );
}
