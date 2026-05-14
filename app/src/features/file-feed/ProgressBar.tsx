import { cn } from '@/utils/cn';

type Props = {
  value: number;
  variant?: 'send' | 'receive';
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
        })}
      />
    </div>
  );
}
