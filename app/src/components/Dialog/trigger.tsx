import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function _DialogTrigger({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger className={cn(className)} {...props} />;
}
