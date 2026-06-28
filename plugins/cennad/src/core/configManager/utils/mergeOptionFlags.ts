import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function mergeOptionFlags(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.option_flags;
  if (!isPlainObject(raw)) return defaults;
  return {
    codex: {
      ...defaults.codex,
      ...(isPlainObject(raw.codex) ? raw.codex : {}),
    },
    antigravity: {
      ...defaults.antigravity,
      ...(isPlainObject(raw.antigravity) ? raw.antigravity : {}),
    },
  };
}
