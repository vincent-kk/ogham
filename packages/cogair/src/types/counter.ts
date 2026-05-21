import { z } from 'zod';

export const CounterSchema = z.object({
  parent_pid: z.number().int(),
  gemini: z.number().int().nonnegative(),
  codex: z.number().int().nonnegative(),
});

export type Counter = z.infer<typeof CounterSchema>;
