import { z } from 'zod';

// Disk cache for `agy models` output (runtime/agy-models.json).
export const AgyModelsCacheSchema = z.object({
  models: z.array(z.string()),
  fetched_at: z.number().int().nonnegative(),
});

export type AgyModelsCache = z.infer<typeof AgyModelsCacheSchema>;
