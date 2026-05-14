import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/utils/cn';

import { Loader } from './Loader';

import type { ComponentProps, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'text' | 'danger';

type Props = ComponentProps<'button'> & {
  variant?: Variant;
  isLoading?: boolean;
  asChild?: boolean;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-blue-500 text-white enabled:hover:bg-blue-400 enabled:active:bg-blue-600',
  secondary: 'bg-zinc-700 text-zinc-100 enabled:hover:bg-zinc-600 enabled:active:bg-zinc-800',
  text: 'text-zinc-300 enabled:hover:text-white enabled:hover:bg-zinc-700/60',
  danger: 'text-red-400 enabled:hover:text-red-300 enabled:hover:bg-red-500/10',
};

export function Button({
  type = 'button',
  variant = 'primary',
  className,
  isLoading = false,
  asChild = false,
  disabled,
  children,
  ...props
}: Props) {
  const Comp = asChild && !isLoading ? Slot : 'button';

  const RenderComp = ({ children: inner }: PropsWithChildren) => (
    <Comp
      type={type}
      className={cn(
        'relative px-3 py-1.5 text-sm font-medium tracking-tight transition-colors rounded-md',
        'inline-flex items-center justify-center gap-1.5',
        'disabled:opacity-40 disabled:cursor-default',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        VARIANT_CLASSES[variant],
        className,
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {inner}
    </Comp>
  );

  if (isLoading) {
    return (
      <RenderComp>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader className="text-inherit size-5!" />
        </div>

        <div className="invisible">{children}</div>
      </RenderComp>
    );
  }

  return <RenderComp>{children}</RenderComp>;
}
