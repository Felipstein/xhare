import * as z from 'zod/mini';

export const cacheTtlSchema = z.enum(['1h', '24h', '7d', 'never']);

export const settingsSchema = z.object({
  downloadFolder: z.string().check(z.minLength(1, 'Pasta de destino obrigatória')),
  cacheTtl: cacheTtlSchema,
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
