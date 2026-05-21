import { z } from 'zod';

import { ConversationOptionsSchema, ModelAliasSchema } from './conversation.js';

export const InterventionStrengthSchema = z.union([
  z.literal(-2),
  z.literal(-1),
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

export type InterventionStrength = z.infer<typeof InterventionStrengthSchema>;

export const ProviderRatioSchema = z.object({
  value: z.number().int().min(0).max(100),
  enabled: z.boolean(),
});

export type ProviderRatio = z.infer<typeof ProviderRatioSchema>;

export const RatioSchema = z.object({
  gemini: ProviderRatioSchema,
  codex: ProviderRatioSchema,
});

export type Ratio = z.infer<typeof RatioSchema>;

export const KeywordsSchema = z.object({
  gemini: z.string(),
  codex: z.string(),
});

export type Keywords = z.infer<typeof KeywordsSchema>;

export const ConfigSchema = z.object({
  ratio: RatioSchema,
  intervention_strength: InterventionStrengthSchema,
  keywords: KeywordsSchema,
  default_model: ModelAliasSchema,
  default_options: ConversationOptionsSchema,
  session_ttl_hours: z.number().int().positive(),
});

export type Config = z.infer<typeof ConfigSchema>;
