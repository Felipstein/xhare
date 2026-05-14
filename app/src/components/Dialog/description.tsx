import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function _DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn(className)} {...props} />;
}
