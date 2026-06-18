import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function mergeDefaultTier(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.default_tier;
  if (!isPlainObject(raw)) return defaults;
  return {
    gemini: raw.gemini ?? defaults.gemini,
    codex: raw.codex ?? defaults.codex,
    antigravity: raw.antigravity ?? defaults.antigravity,
  };
}
