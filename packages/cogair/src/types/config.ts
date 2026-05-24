import { z } from 'zod';

import { ModelAliasSchema } from './conversation.js';
import { CodexFlagsSchema, GeminiFlagsSchema } from './dispatch.js';

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

export const OptionFlagsSchema = z.object({
  gemini: GeminiFlagsSchema,
  codex: CodexFlagsSchema,
});

export type OptionFlags = z.infer<typeof OptionFlagsSchema>;

export const ArtifactLocationSchema = z.enum(['project', 'user']);

export type ArtifactLocation = z.infer<typeof ArtifactLocationSchema>;

export const ArtifactsConfigSchema = z.object({
  enabled: z.boolean(),
  location: ArtifactLocationSchema,
});

export type ArtifactsConfig = z.infer<typeof ArtifactsConfigSchema>;

export const PreambleConfigSchema = z.object({
  gemini: z.string(),
  codex: z.string(),
});

export type PreambleConfig = z.infer<typeof PreambleConfigSchema>;

export const RecencyLevelSchema = z.enum(['off', 'normal', 'strict']);

export type RecencyLevel = z.infer<typeof RecencyLevelSchema>;

export const RecencyFactorConfigSchema = z.object({
  gemini: RecencyLevelSchema,
  codex: RecencyLevelSchema,
});

export type RecencyFactorConfig = z.infer<typeof RecencyFactorConfigSchema>;

export const ConfigSchema = z.object({
  ratio: RatioSchema,
  intervention_strength: InterventionStrengthSchema,
  keywords: KeywordsSchema,
  default_model: ModelAliasSchema,
  option_flags: OptionFlagsSchema,
  session_ttl_hours: z.number().int().positive(),
  spawn_timeout_ms: z.number().int().positive(),
  artifacts: ArtifactsConfigSchema,
  preamble: PreambleConfigSchema,
  recency_factor: RecencyFactorConfigSchema,
});

export type Config = z.infer<typeof ConfigSchema>;
