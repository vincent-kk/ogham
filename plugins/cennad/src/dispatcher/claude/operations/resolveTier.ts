import type { ClaudeModelMap, Tier } from '../../../types/index.js';

export interface ResolvedClaudeTier {
  model: string;
  effort?: string;
}

// Resolve a tier to a concrete {model, effort} from config's model_map.claude,
// with per-tier env overrides (CENNAD_CLAUDE_<TIER>_MODEL / _EFFORT). effort is
// omitted when neither env nor the map supplies one (e.g. a model with no effort
// support) so buildArgs sends no --effort flag.
export function resolveClaudeTier(
  tier: Tier,
  map: ClaudeModelMap | undefined,
): ResolvedClaudeTier {
  const key = tier.toUpperCase();
  const tierConfig = map ? map[tier] : undefined;
  const model =
    process.env[`CENNAD_CLAUDE_${key}_MODEL`] ?? tierConfig?.model ?? 'opus';
  const effort =
    process.env[`CENNAD_CLAUDE_${key}_EFFORT`] ?? tierConfig?.effort;
  return effort ? { model, effort } : { model };
}
