import * as DialogPrimitive from '@radix-ui/react-dialog';

import type { ComponentProps } from 'react';

export function _DialogRoot({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}
