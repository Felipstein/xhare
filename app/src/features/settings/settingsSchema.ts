import { z } from 'zod';

export const cacheTtlSchema = z.enum(['1h', '24h', '7d', 'never']);

export const settingsSchema = z.object({
  downloadFolder: z.string().min(1, 'Pasta de destino obrigatória'),
  cacheTtl: cacheTtlSchema,
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
