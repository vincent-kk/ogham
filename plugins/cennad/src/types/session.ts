import { z } from 'zod';

import { ProviderSchema } from './conversation.js';

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
  options: z.record(z.unknown()),
});

export type SessionMeta = z.infer<typeof SessionMetaSchema>;

export const ProjectMetaSchema = z.object({
  cwd: z.string(),
  created_at: z.string(),
});

export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;
