import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'w-full px-3 h-9 text-sm bg-zinc-900 border border-zinc-700 rounded-md',
        'text-zinc-100 placeholder:text-zinc-500',
        'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        className,
      )}
      {...props}
    />
  );
}
