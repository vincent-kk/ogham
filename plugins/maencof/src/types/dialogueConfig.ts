import { z } from 'zod';

// ─── Dialogue Config ────────────────────────────────────────────────

export const DialogueConfigSchema = z.object({
  schema_version: z.number().int().min(1).default(1),
  injection: z
    .object({
      enabled: z.boolean().default(true),
      budget_chars: z.number().int().min(0).default(2000),
    })
    .default({ enabled: true, budget_chars: 2000 }),
});

export type DialogueConfig = z.infer<typeof DialogueConfigSchema>;
