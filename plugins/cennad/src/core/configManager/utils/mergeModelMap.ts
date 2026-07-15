import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

interface TierConfigFallback {
  model: string;
  effort?: string;
}

// Merge one provider tier. Take the raw tier wholesale when it carries a string
// model (so a model without effort support, e.g. haiku or a bare agy model, does not
// inherit the default's effort); otherwise fall back to the default tier config.
// A bare string raw is the pre-{model,effort} antigravity schema — migrate it to
// {model: raw} instead of discarding the user's chosen model.
function mergeTierConfig(raw: unknown, fallback: TierConfigFallback): unknown {
  if (typeof raw === 'string') return { model: raw };
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
