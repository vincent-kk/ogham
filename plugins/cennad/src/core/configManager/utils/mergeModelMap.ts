import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

interface TierConfigFallback {
  model: string;
  effort?: string;
}

// Merge one codex/claude tier. Take the raw tier wholesale when it carries a
// string model (so a model without effort support, e.g. haiku, does not inherit
// the default's effort); otherwise fall back to the default tier config.
function mergeTierConfig(raw: unknown, fallback: TierConfigFallback): unknown {
  if (!isPlainObject(raw) || typeof raw.model !== 'string') return fallback;
  const tier: { model: string; effort?: unknown } = { model: raw.model };
  if (typeof raw.effort === 'string') tier.effort = raw.effort;
  return tier;
}

export function mergeModelMap(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.model_map;
  if (!isPlainObject(raw)) return defaults;
  const rawCodex = isPlainObject(raw.codex) ? raw.codex : {};
  const rawClaude = isPlainObject(raw.claude) ? raw.claude : {};
  return {
    codex: {
      high: mergeTierConfig(rawCodex.high, defaults.codex.high),
      mid: mergeTierConfig(rawCodex.mid, defaults.codex.mid),
      low: mergeTierConfig(rawCodex.low, defaults.codex.low),
    },
    antigravity: {
      ...defaults.antigravity,
      ...(isPlainObject(raw.antigravity) ? raw.antigravity : {}),
    },
    claude: {
      high: mergeTierConfig(rawClaude.high, defaults.claude.high),
      mid: mergeTierConfig(rawClaude.mid, defaults.claude.mid),
      low: mergeTierConfig(rawClaude.low, defaults.claude.low),
    },
  };
}
