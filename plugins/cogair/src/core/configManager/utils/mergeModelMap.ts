import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function mergeModelMap(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.model_map;
  if (!isPlainObject(raw)) return defaults;
  return {
    antigravity: {
      ...defaults.antigravity,
      ...(isPlainObject(raw.antigravity) ? raw.antigravity : {}),
    },
  };
}
