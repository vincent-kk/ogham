import { z } from 'zod';

export const CounterSchema = z.object({
  parent_pid: z.number().int(),
  antigravity: z.number().int().nonnegative(),
  codex: z.number().int().nonnegative(),
  claude: z.number().int().nonnegative(),
});

export type Counter = z.infer<typeof CounterSchema>;
