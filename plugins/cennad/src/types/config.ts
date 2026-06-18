import { z } from 'zod';

import { TierSchema } from './conversation.js';
import {
  AntigravityFlagsSchema,
  CodexFlagsSchema,
  GeminiFlagsSchema,
  TierModelMapSchema,
} from './dispatch.js';

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
  antigravity: ProviderRatioSchema,
});

export type Ratio = z.infer<typeof RatioSchema>;

export const KeywordsSchema = z.object({
  gemini: z.string(),
  codex: z.string(),
  antigravity: z.string(),
});

export type Keywords = z.infer<typeof KeywordsSchema>;

export const OptionFlagsSchema = z.object({
  gemini: GeminiFlagsSchema,
  codex: CodexFlagsSchema,
  antigravity: AntigravityFlagsSchema,
});

export type OptionFlags = z.infer<typeof OptionFlagsSchema>;

// Per-tier model-name mapping. Only antigravity serves multiple model families,
// so it is the only provider that needs an explicit map; gemini/codex keep their
// env-based modelAlias resolution. TierModelMapSchema lives in dispatch.ts to
// avoid an import cycle.
export const ModelMapSchema = z.object({
  antigravity: TierModelMapSchema,
});

export type ModelMap = z.infer<typeof ModelMapSchema>;

// Per-provider default tier, applied when a dispatch omits an explicit tier
// (start_conversation's optional tier; continue_conversation, which never
// restores the original session tier). Per-provider because cost / rate-limit
// characteristics differ across providers.
export const DefaultTierSchema = z.object({
  gemini: TierSchema,
  codex: TierSchema,
  antigravity: TierSchema,
});

export type DefaultTier = z.infer<typeof DefaultTierSchema>;

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
  antigravity: z.string(),
});

export type PreambleConfig = z.infer<typeof PreambleConfigSchema>;

export const RecencyLevelSchema = z.enum(['off', 'auto', 'strict']);

export type RecencyLevel = z.infer<typeof RecencyLevelSchema>;

export const RecencyFactorConfigSchema = z.object({
  antigravity: RecencyLevelSchema,
  gemini: RecencyLevelSchema,
  codex: RecencyLevelSchema,
});

export type RecencyFactorConfig = z.infer<typeof RecencyFactorConfigSchema>;

// YouTube ingestion via the @ogham/yt-dlp-mcp server, modeled as a standalone MCP
// addon rather than a per-provider LLM feature. When enabled, cennad provisions the
// yt-dlp-mcp server into each checked target CLI — antigravity's global
// mcp_config.json and/or codex's config.toml (via `codex mcp add`). gemini is
// excluded: it ingests YouTube natively and is being phased out. `language` sets the
// server's YTDLP_LANG (transcript + title/metadata language).
export const YoutubeAddonLanguageSchema = z.enum(['en', 'ko']);

export type YoutubeAddonLanguage = z.infer<typeof YoutubeAddonLanguageSchema>;

export const YoutubeAddonTargetsSchema = z.object({
  codex: z.boolean(),
  antigravity: z.boolean(),
});

export type YoutubeAddonTargets = z.infer<typeof YoutubeAddonTargetsSchema>;

export const YoutubeAddonConfigSchema = z.object({
  enabled: z.boolean(),
  language: YoutubeAddonLanguageSchema,
  targets: YoutubeAddonTargetsSchema,
});

export type YoutubeAddonConfig = z.infer<typeof YoutubeAddonConfigSchema>;

// Standalone MCP addons, independent of provider routing. Currently just the
// YouTube (yt-dlp) addon; new addons slot in as sibling keys.
export const AddonsConfigSchema = z.object({
  youtube: YoutubeAddonConfigSchema,
});

export type AddonsConfig = z.infer<typeof AddonsConfigSchema>;

// Base object schema, exported so callers that need `.shape`/`.extend` (e.g.
// partial merges) keep access. ConfigSchema wraps it with the mutual-exclusion
// refinement below; `.parse`/`.safeParse` still work on the wrapped schema.
export const ConfigObjectSchema = z.object({
  ratio: RatioSchema,
  intervention_strength: InterventionStrengthSchema,
  keywords: KeywordsSchema,
  option_flags: OptionFlagsSchema,
  model_map: ModelMapSchema,
  default_tier: DefaultTierSchema,
  session_ttl_hours: z.number().int().positive(),
  spawn_timeout_ms: z.number().int().positive(),
  artifacts: ArtifactsConfigSchema,
  preamble: PreambleConfigSchema,
  recency_factor: RecencyFactorConfigSchema,
  addons: AddonsConfigSchema,
});

// gemini and antigravity are mutually exclusive Google engines: the Gemini CLI
// service ends 2026-06-18 and cennad transitions to the Antigravity CLI. Only
// one may be enabled at a time. configManager.normalizeMutualExclusion auto-
// corrects legacy files; this refine guards saves coming from the settings UI.
export const ConfigSchema = ConfigObjectSchema.superRefine((cfg, ctx) => {
  if (cfg.ratio.gemini.enabled && cfg.ratio.antigravity.enabled) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ratio', 'antigravity', 'enabled'],
      message:
        'gemini and antigravity are mutually exclusive (Gemini CLI service ends 2026-06-18). Enable only one Google engine.',
    });
  }
});

export type Config = z.infer<typeof ConfigSchema>;
