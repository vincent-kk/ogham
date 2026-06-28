import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import type { ClaudeTierConfig } from '../../../types/index.js';

import { isPlainObject } from './isPlainObject.js';

// Merge one claude tier. Take the raw tier wholesale when it carries a string
// model (so a model without effort support, e.g. haiku, does not inherit the
// default's effort); otherwise fall back to the default tier config.
function mergeClaudeTier(raw: unknown, fallback: ClaudeTierConfig): unknown {
  if (!isPlainObject(raw) || typeof raw.model !== 'string') return fallback;
  const tier: { model: string; effort?: unknown } = { model: raw.model };
  if (typeof raw.effort === 'string') tier.effort = raw.effort;
  return tier;
}

export function mergeModelMap(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.model_map;
  if (!isPlainObject(raw)) return defaults;
  const rawClaude = isPlainObject(raw.claude) ? raw.claude : {};
  return {
    antigravity: {
      ...defaults.antigravity,
      ...(isPlainObject(raw.antigravity) ? raw.antigravity : {}),
    },
    claude: {
      high: mergeClaudeTier(rawClaude.high, defaults.claude.high),
      mid: mergeClaudeTier(rawClaude.mid, defaults.claude.mid),
      low: mergeClaudeTier(rawClaude.low, defaults.claude.low),
    },
  };
}
