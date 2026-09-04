import { AGY_VARIANT_SUFFIXES } from '../../../constants/agyModels.js';
import type { AntigravityModelMap, Tier } from '../../../types/index.js';
import { canonicalizeAgyModelName } from '../../../utils/canonicalizeAgyModelName.js';

// A name that already carries its variant — parenthesised, or a slug ending in a
// known suffix — is complete and must be sent as-is.
function isComplete(model: string): boolean {
  if (model.includes('(')) return true;
  if (model.includes(' ')) return false;
  const lower = model.toLowerCase();
  return AGY_VARIANT_SUFFIXES.some((variant) => lower.endsWith(`-${variant}`));
}

// The join follows the spelling of the base: display names take " (Variant)",
// catalog slugs take "-variant".
function joinName(model: string, effort: string): string {
  return model.includes(' ')
    ? `${model} (${effort})`
    : `${model}-${effort.toLowerCase()}`;
}

// Resolves a tier to the concrete agy model name from config's model_map.antigravity.
// agy takes ONE complete name and rejects any mixture of its two spellings
// (measured 2026-07-28): "Gemini 3.6 Flash (High)" ok · "gemini-3.6-flash-high" ok ·
// "gemini-3.6-flash" + --effort high ok · "gemini-3.6-flash-medium (High)" rejected.
// A missing map or an empty model omits --model, letting agy pick its default. Model
// names are never hardcoded — they live entirely in config. A tab-separated catalog
// row saved by an older parser is narrowed to its canonical slug before this logic.
export function resolveAntigravityModel(
  tier: Tier,
  map: AntigravityModelMap | undefined,
): string | null {
  if (!map) return null;
  const { model, effort } = map[tier];
  const trimmedModel = canonicalizeAgyModelName(model);
  if (trimmedModel.length === 0) return null;
  const trimmedEffort = effort?.trim();
  if (!trimmedEffort || isComplete(trimmedModel)) return trimmedModel;
  return joinName(trimmedModel, trimmedEffort);
}
