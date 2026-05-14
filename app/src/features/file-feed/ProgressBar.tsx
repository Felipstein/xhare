import { cn } from '@/utils/cn';

type Props = {
  value: number;
  variant?: 'send' | 'receive' | 'zip';
  className?: string;
};

export function ProgressBar({ value, variant = 'send', className }: Props) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1 w-full rounded-full bg-zinc-700/60 overflow-hidden', className)}
    >
      <div
        style={{ width: `${safe}%` }}
        className={cn('h-full transition-[width] duration-300 ease-out', {
          'bg-blue-500': variant === 'send',
          'bg-green-500': variant === 'receive',
          // Striped amber bar — animated diagonal stripes give the zip its own
          // visual language distinct from a flat transfer fill.
          'bg-amber-400 bg-[linear-gradient(135deg,rgba(255,255,255,0.18)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.18)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-[zip-stripes_700ms_linear_infinite]':
            variant === 'zip',
        })}
      />
    </div>
  );
}
