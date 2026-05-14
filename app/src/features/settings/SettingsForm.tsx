import { zodResolver } from '@hookform/resolvers/zod';
import { FolderIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { RadioGroup } from '@/components/RadioGroup';
import { pickFolder } from '@/services/pickFolder';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/utils/cn';

import { settingsSchema, type SettingsFormValues } from './settingsSchema';

import type { CacheTtl } from '@/types/Settings';

const TTL_OPTIONS: { value: CacheTtl; label: string }[] = [
  { value: '1h', label: '1 hora' },
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: 'never', label: 'Nunca' },
];

type Props = {
  onSaved?: () => void;
  onCancel?: () => void;
};

export function SettingsForm({ onSaved, onCancel }: Props) {
  const downloadFolder = useSettingsStore((s) => s.downloadFolder);
  const cacheTtl = useSettingsStore((s) => s.cacheTtl);
  const setDownloadFolder = useSettingsStore((s) => s.setDownloadFolder);
  const setCacheTtl = useSettingsStore((s) => s.setCacheTtl);

  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { downloadFolder, cacheTtl },
    mode: 'onBlur',
  });

  useEffect(() => {
    reset({ downloadFolder, cacheTtl });
  }, [downloadFolder, cacheTtl, reset]);

  const selectedFolder = watch('downloadFolder');

  const submit = handleSubmit((values) => {
    setDownloadFolder(values.downloadFolder);
    setCacheTtl(values.cacheTtl);
    onSaved?.();
  });

  const browseFolder = async (): Promise<void> => {
    const picked = await pickFolder(selectedFolder);
    if (picked) {
      setValue('downloadFolder', picked, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <fieldset className="flex flex-col gap-2 min-w-0">
        <legend className="text-sm font-semibold text-zinc-100 mb-1">Pasta de destino</legend>
        <button
          type="button"
          onClick={() => void browseFolder()}
          title={selectedFolder}
          className={cn(
            'group flex items-center gap-3 w-full max-w-full min-w-0 text-left px-3 h-11 rounded-md border border-zinc-700 bg-zinc-900 overflow-hidden',
            'hover:border-zinc-600 hover:bg-zinc-800/60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
            'transition-colors',
          )}
        >
          <FolderIcon className="size-4 text-zinc-500 shrink-0 group-hover:text-zinc-400" />
          <span className="flex-1 min-w-0 truncate text-sm text-zinc-200 font-mono">
            {selectedFolder}
          </span>
          <span className="shrink-0 text-xs text-zinc-500 group-hover:text-zinc-300">Alterar…</span>
        </button>
        {formState.errors.downloadFolder && (
          <span className="text-xs text-red-400">{formState.errors.downloadFolder.message}</span>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-zinc-100 mb-1">Expiração do cache</legend>
        <Controller
          control={control}
          name="cacheTtl"
          render={({ field }) => (
            <RadioGroup.Root value={field.value} onValueChange={field.onChange} className="gap-0">
              {TTL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  data-selected={field.value === opt.value || undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-default text-sm text-zinc-200 hover:bg-zinc-700/30 data-[selected]:bg-zinc-700/50 transition-colors"
                >
                  <RadioGroup.Item value={opt.value} id={`ttl-${opt.value}`} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </RadioGroup.Root>
          )}
        />
      </fieldset>

      <footer className="flex justify-end gap-2 pt-2 border-t border-zinc-700/60 -mx-5 -mb-5 px-5 py-3 bg-zinc-900/40 rounded-b-xl">
        <Button
          type="button"
          variant="text"
          onClick={() => {
            reset({ downloadFolder, cacheTtl });
            onCancel?.();
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={!formState.isDirty || formState.isSubmitting}>
          Salvar
        </Button>
      </footer>
    </form>
  );
}
