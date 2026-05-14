import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import type { ComponentProps } from 'react';

export function _TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger {...props} />;
}
