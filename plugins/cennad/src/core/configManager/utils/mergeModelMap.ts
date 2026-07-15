import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

interface TierConfigFallback {
  model: string;
  effort?: string;
}

// Matches an agy display name's base + trailing "(variant)" —
// "Gemini 3.5 Flash (Medium)" → ["Gemini 3.5 Flash", "Medium"]. Module-scoped so the
// migration path reuses one compiled RegExp; mirrors parseAgyModel in the settings UI
// (keep in sync).
const AGY_MODEL_VARIANT_RE = /^(.*?)\s*\(([^()]+)\)\s*$/;

// The pre-{model,effort} antigravity schema stored the full agy display name. Split the
// trailing "(variant)" into {model, effort} so the migrated value matches the current
// schema: the settings UI lists bases in its model dropdown and dispatch recomposes
// "model (effort)". A name without a trailing variant migrates to {model} (no effort).
function parseLegacyAntigravityModel(raw: string): {
  model: string;
  effort?: string;
} {
  const match = AGY_MODEL_VARIANT_RE.exec(raw);
  if (match) return { model: match[1].trim(), effort: match[2].trim() };
  return { model: raw.trim() };
}

// Merge one provider tier. Take the raw tier wholesale when it carries a string model
// (so a model without effort support, e.g. haiku, does not inherit the default's
// effort); otherwise fall back to the default tier config. A bare string raw is the
// legacy antigravity schema — migrate it via parseLegacyAntigravityModel instead of
// discarding the user's chosen model.
function mergeTierConfig(raw: unknown, fallback: TierConfigFallback): unknown {
  if (typeof raw === 'string') return parseLegacyAntigravityModel(raw);
  if (!isPlainObject(raw) || typeof raw.model !== 'string') return fallback;
  const tier: { model: string; effort?: unknown } = { model: raw.model };
  if (typeof raw.effort === 'string') tier.effort = raw.effort;
  return tier;
}

export function mergeModelMap(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.model_map;
  if (!isPlainObject(raw)) return defaults;
  const rawCodex = isPlainObject(raw.codex) ? raw.codex : {};
  const rawAntigravity = isPlainObject(raw.antigravity) ? raw.antigravity : {};
  const rawClaude = isPlainObject(raw.claude) ? raw.claude : {};
  return {
    codex: {
      high: mergeTierConfig(rawCodex.high, defaults.codex.high),
      mid: mergeTierConfig(rawCodex.mid, defaults.codex.mid),
      low: mergeTierConfig(rawCodex.low, defaults.codex.low),
    },
    antigravity: {
      high: mergeTierConfig(rawAntigravity.high, defaults.antigravity.high),
      mid: mergeTierConfig(rawAntigravity.mid, defaults.antigravity.mid),
      low: mergeTierConfig(rawAntigravity.low, defaults.antigravity.low),
    },
    claude: {
      high: mergeTierConfig(rawClaude.high, defaults.claude.high),
      mid: mergeTierConfig(rawClaude.mid, defaults.claude.mid),
      low: mergeTierConfig(rawClaude.low, defaults.claude.low),
    },
  };
}
