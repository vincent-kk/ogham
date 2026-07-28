import { z } from 'zod';

import { TierSchema } from './conversation.js';
import {
  AntigravityFlagsSchema,
  AntigravityModelMapSchema,
  ClaudeFlagsSchema,
  ClaudeModelMapSchema,
  CodexFlagsSchema,
  CodexModelMapSchema,
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
  // Auto-routing opt-out. The provider stays a crosscheck participant and an
  // explicit-call target; only the hooks' own election skips it.
  crosscheck_only: z.boolean().optional(),
});

export type ProviderRatio = z.infer<typeof ProviderRatioSchema>;

export const RatioSchema = z.object({
  codex: ProviderRatioSchema,
  antigravity: ProviderRatioSchema,
  claude: ProviderRatioSchema,
});

export type Ratio = z.infer<typeof RatioSchema>;

export const KeywordsSchema = z.object({
  codex: z.string(),
  antigravity: z.string(),
  claude: z.string(),
});

export type Keywords = z.infer<typeof KeywordsSchema>;

export const OptionFlagsSchema = z.object({
  codex: CodexFlagsSchema,
  antigravity: AntigravityFlagsSchema,
  claude: ClaudeFlagsSchema,
});

export type OptionFlags = z.infer<typeof OptionFlagsSchema>;

// Per-tier model mapping. Each provider maps a tier to a {model, effort} pair;
// antigravity recomposes them into agy's "model (effort)" display name at dispatch.
// The tier-map schemas live in dispatch.ts to avoid an import cycle.
export const ModelMapSchema = z.object({
  codex: CodexModelMapSchema,
  antigravity: AntigravityModelMapSchema,
  claude: ClaudeModelMapSchema,
});

export type ModelMap = z.infer<typeof ModelMapSchema>;

// Per-provider default tier, applied when a dispatch omits an explicit tier and no
// session tier is on record (start_conversation's optional tier; a legacy session
// written before tier was persisted). continue_conversation prefers the session's
// own tier. Per-provider because cost / rate-limit characteristics differ.
export const DefaultTierSchema = z.object({
  codex: TierSchema,
  antigravity: TierSchema,
  claude: TierSchema,
});

export type DefaultTier = z.infer<typeof DefaultTierSchema>;

export const TierDurationSchema = z.object({
  apex: z.number().int().positive(),
  high: z.number().int().positive(),
  mid: z.number().int().positive(),
  low: z.number().int().positive(),
});

export type TierDuration = z.infer<typeof TierDurationSchema>;

// Liveness-based dispatch limits. idle_ms is the no-output ceiling: every provider
// CLI streams progress events, so a model that is still thinking keeps resetting
// it and only a stalled process trips it. hard_cap_ms is the absolute stop, per
// tier — an agentic run is expected to take far longer than a cheap one.
export const TimeoutsConfigSchema = z.object({
  idle_ms: z.number().int().positive(),
  hard_cap_ms: TierDurationSchema,
});

export type TimeoutsConfig = z.infer<typeof TimeoutsConfigSchema>;

export const ArtifactLocationSchema = z.enum(['project', 'user']);

export type ArtifactLocation = z.infer<typeof ArtifactLocationSchema>;

export const ArtifactsConfigSchema = z.object({
  enabled: z.boolean(),
  location: ArtifactLocationSchema,
});

export type ArtifactsConfig = z.infer<typeof ArtifactsConfigSchema>;

export const PreambleConfigSchema = z.object({
  codex: z.string(),
  antigravity: z.string(),
  claude: z.string(),
});

export type PreambleConfig = z.infer<typeof PreambleConfigSchema>;

export const RecencyLevelSchema = z.enum(['off', 'auto', 'strict']);

export type RecencyLevel = z.infer<typeof RecencyLevelSchema>;

export const RecencyFactorConfigSchema = z.object({
  antigravity: RecencyLevelSchema,
  codex: RecencyLevelSchema,
  claude: RecencyLevelSchema,
});

export type RecencyFactorConfig = z.infer<typeof RecencyFactorConfigSchema>;

// YouTube ingestion via the @ogham/yt-dlp-mcp server, modeled as a standalone MCP
// addon rather than a per-provider LLM feature. When enabled, cennad provisions the
// yt-dlp-mcp server into each checked target CLI — the claude/codex user MCP
// scope and/or antigravity's global mcp_config.json. `language` sets the
// server's YTDLP_LANG (transcript + title/metadata language).
export const YoutubeAddonLanguageSchema = z.enum(['en', 'ko']);

export type YoutubeAddonLanguage = z.infer<typeof YoutubeAddonLanguageSchema>;

export const YoutubeAddonTargetsSchema = z.object({
  claude: z.boolean(),
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

export const ConfigObjectSchema = z.object({
  ratio: RatioSchema,
  intervention_strength: InterventionStrengthSchema,
  keywords: KeywordsSchema,
  option_flags: OptionFlagsSchema,
  model_map: ModelMapSchema,
  default_tier: DefaultTierSchema,
  session_ttl_hours: z.number().int().positive(),
  timeouts: TimeoutsConfigSchema,
  artifacts: ArtifactsConfigSchema,
  preamble: PreambleConfigSchema,
  recency_factor: RecencyFactorConfigSchema,
  addons: AddonsConfigSchema,
});

// Unknown keys are stripped on parse — this is how legacy per-provider sections
// (e.g. a removed provider lingering on disk) get pruned at load/save.
export const ConfigSchema = ConfigObjectSchema;

export type Config = z.infer<typeof ConfigSchema>;
