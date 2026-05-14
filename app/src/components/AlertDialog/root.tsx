import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import type { ComponentProps } from 'react';

export function _AlertDialogRoot(props: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root {...props} />;
}
