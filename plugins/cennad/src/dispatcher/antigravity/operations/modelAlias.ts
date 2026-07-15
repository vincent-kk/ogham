import type { AntigravityModelMap, Tier } from '../../../types/index.js';

// Resolves a tier to the concrete agy model name from config's model_map.antigravity.
// agy carries the variant inside the display name ("Gemini 3.5 Flash (Medium)"), so
// model + effort are recomposed into that form here. A missing map or an empty model
// omits --model, letting agy pick its default. Model names are never hardcoded — they
// live entirely in config.
export function resolveAntigravityModel(
  tier: Tier,
  map: AntigravityModelMap | undefined,
): string | null {
  if (!map) return null;
  const { model, effort } = map[tier];
  const trimmedModel = model.trim();
  if (trimmedModel.length === 0) return null;
  const trimmedEffort = effort?.trim();
  return trimmedEffort ? `${trimmedModel} (${trimmedEffort})` : trimmedModel;
}
