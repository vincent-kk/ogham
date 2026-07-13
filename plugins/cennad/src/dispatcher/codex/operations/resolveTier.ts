import type { CodexModelMap, Tier } from '../../../types/index.js';

export interface ResolvedCodexTier {
  model?: string;
  effort?: string;
}

// Resolve a tier to a concrete {model, effort} from config's model_map.codex, with
// per-tier env overrides (CENNAD_CODEX_<TIER>_MODEL / _EFFORT). Either key is
// omitted when unresolved, so buildArgs sends no flag and codex falls back to the
// user's ~/.codex/config.toml for that dimension.
export function resolveCodexTier(
  tier: Tier,
  map: CodexModelMap | undefined,
): ResolvedCodexTier {
  const key = tier.toUpperCase();
  const tierConfig = map ? map[tier] : undefined;
  const model = process.env[`CENNAD_CODEX_${key}_MODEL`] ?? tierConfig?.model;
  const effort =
    process.env[`CENNAD_CODEX_${key}_EFFORT`] ?? tierConfig?.effort;

  const resolved: ResolvedCodexTier = {};
  if (model && model.trim().length > 0) resolved.model = model.trim();
  if (effort && effort.trim().length > 0) resolved.effort = effort.trim();
  return resolved;
}
