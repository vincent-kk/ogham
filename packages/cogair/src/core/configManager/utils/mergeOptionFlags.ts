import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function mergeOptionFlags(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.option_flags;
  if (!isPlainObject(raw)) return defaults;
  return {
    gemini: {
      ...defaults.gemini,
      ...(isPlainObject(raw.gemini) ? raw.gemini : {}),
    },
    codex: {
      ...defaults.codex,
      ...(isPlainObject(raw.codex) ? raw.codex : {}),
    },
  };
}
