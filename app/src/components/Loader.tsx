import { Loader2Icon } from 'lucide-react';

import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function Loader({ className, ...props }: ComponentProps<'svg'>) {
  return <Loader2Icon className={cn('animate-spin size-6 text-zinc-600', className)} {...props} />;
}
