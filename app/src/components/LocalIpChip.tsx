import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

import { cn } from '@/utils/cn';
import { useLocalIp } from '@/hooks/useLocalIp';

export function LocalIpChip({ className }: { className?: string }) {
  const ip = useLocalIp();
  const [copied, setCopied] = useState(false);

  if (!ip) return null;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be blocked in some contexts
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title="Copiar seu IP"
      aria-label="Copiar seu IP"
      className={cn(
        'group inline-flex items-center gap-1.5 h-6 px-2 rounded-md',
        'text-[11px] font-mono tabular-nums text-zinc-400 bg-zinc-800/60 border border-zinc-700/60',
        'hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600 transition-colors',
        className,
      )}
    >
      <span>{ip}</span>
      {copied ? (
        <CheckIcon className="size-3 text-green-400" />
      ) : (
        <CopyIcon className="size-3 opacity-60 group-hover:opacity-100" />
      )}
    </button>
  );
}
