import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import type { ComponentProps } from 'react';

export function _AlertDialogTrigger(props: ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger {...props} />;
}
