import { toast } from 'sonner';

import { cn } from '@/utils/cn';

type ToastAction = {
  label: string;
  onClick: () => void;
};

type NotifyOptions = {
  title: string;
  actions?: ToastAction[];
  variant?: 'default' | 'error';
  duration?: number;
};

type ToastBodyProps = NotifyOptions & {
  toastId: string | number;
};

function ToastBody({ title, actions, variant = 'default', toastId }: ToastBodyProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 w-[360px] px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md',
        'bg-zinc-800/95 border',
        variant === 'error' ? 'border-red-500/30' : 'border-zinc-700/70',
      )}
    >
      <p className="text-sm text-zinc-100 leading-snug">{title}</p>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-4">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick();
                toast.dismiss(toastId);
              }}
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function notify(opts: NotifyOptions): string | number {
  return toast.custom(
    (id) => (
      <ToastBody toastId={id} title={opts.title} actions={opts.actions} variant={opts.variant} />
    ),
    { duration: opts.duration },
  );
}

export function notifyError(title: string, duration?: number): string | number {
  return notify({ title, variant: 'error', duration });
}

export function dismissToast(id: string | number): void {
  toast.dismiss(id);
}
