import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function _DialogClose({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close className={cn(className)} {...props} />;
}
