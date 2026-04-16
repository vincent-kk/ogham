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
  session_recap: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({ enabled: true }),
});

export type DialogueConfig = z.infer<typeof DialogueConfigSchema>;

export const DEFAULT_DIALOGUE_CONFIG: DialogueConfig = {
  schema_version: 1,
  injection: { enabled: true, budget_chars: 2000 },
  session_recap: { enabled: true },
};

/** Environment variable that, when set to `"1"`, disables all dialogue injection. */
export const DIALOGUE_DISABLE_ENV = 'MAENCOF_DISABLE_DIALOGUE';
