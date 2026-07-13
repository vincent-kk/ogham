import { z } from 'zod';

import { CodexEffortSchema } from './dispatch.js';

// One `codex debug models` catalog entry, reduced to what cennad needs: the model
// slug, the effort levels that model advertises, and the blurb the settings UI
// shows so a tier can be matched to the model's role (frontier / balanced / fast).
export const CodexModelSchema = z.object({
  slug: z.string(),
  efforts: z.array(CodexEffortSchema),
  default_effort: CodexEffortSchema.optional(),
  description: z.string().optional(),
});

export type CodexModel = z.infer<typeof CodexModelSchema>;

// Disk cache for the parsed catalog (runtime/codex-models.json).
export const CodexModelsCacheSchema = z.object({
  models: z.array(CodexModelSchema),
  fetched_at: z.number().int().nonnegative(),
});

export type CodexModelsCache = z.infer<typeof CodexModelsCacheSchema>;
