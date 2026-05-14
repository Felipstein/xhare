import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function _AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('text-sm text-zinc-400 leading-relaxed', className)}
      {...props}
    />
  );
}
