import type { Tier, TierModelMap } from '../../../types/index.js';

// Resolves a tier alias to a concrete agy model full-name from config's
// model_map.antigravity. A missing map omits -m so agy picks its default.
// Unlike codex/gemini, model names are never hardcoded here — they live
// entirely in config.
export function resolveAntigravityModel(
  tier: Tier,
  map: TierModelMap | undefined,
): string | null {
  if (!map) return null;
  const name = map[tier];
  return name && name.trim().length > 0 ? name : null;
}
