import { z } from 'zod';

import { ProviderSchema, TierSchema } from './conversation.js';

export const SessionMetaSchema = z.object({
  session_id: z.string().uuid(),
  provider: ProviderSchema,
  created_at: z.string(),
  last_used_at: z.string(),
  turn_count: z.number().int().nonnegative(),
  external_session_ref: z.string(),
  cwd: z.string(),
  project_hash: z.string(),
  model: z.string(),
  // Tier the session was started with. continue_conversation restores it when the
  // caller omits a tier, so a resumed turn keeps the same model — codex warns and
  // can lose thread continuity if the model changes mid-session. Optional: sessions
  // written before this field existed fall back to default_tier.
  tier: TierSchema.optional(),
  options: z.record(z.unknown()),
});

export type SessionMeta = z.infer<typeof SessionMetaSchema>;

export const ProjectMetaSchema = z.object({
  cwd: z.string(),
  created_at: z.string(),
});

export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
