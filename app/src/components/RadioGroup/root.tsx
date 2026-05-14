import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function _RadioGroupRoot({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}
