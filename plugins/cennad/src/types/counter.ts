import { z } from 'zod';

const CounterCountsSchema = z.object({
  antigravity: z.number().int().nonnegative(),
  codex: z.number().int().nonnegative(),
  claude: z.number().int().nonnegative(),
});

const CurrentCounterSchema = CounterCountsSchema.extend({
  host_session_id: z.string().trim().min(1),
});

const LegacyCounterSchema = CounterCountsSchema.extend({
  parent_pid: z.number().int().positive(),
}).transform(({ parent_pid, ...counts }) => ({
  host_session_id: `claude-pid:${parent_pid}`,
  ...counts,
}));

export const CounterSchema = z.union([
  CurrentCounterSchema,
  LegacyCounterSchema,
]);

export type Counter = z.infer<typeof CounterSchema>;
