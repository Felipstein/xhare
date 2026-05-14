import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import type { ComponentProps } from 'react';

export function _AlertDialogAction(props: ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return <AlertDialogPrimitive.Action {...props} />;
}

export function _AlertDialogCancel(props: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel {...props} />;
}
