import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import type { ComponentProps } from 'react';

export function _TooltipRoot({
  delayDuration = 200,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />;
}

export const _TooltipProvider = TooltipPrimitive.Provider;
