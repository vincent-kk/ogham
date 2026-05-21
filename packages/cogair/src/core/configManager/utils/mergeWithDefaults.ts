import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';
import { normalizeRatio } from './normalizeRatio.js';

export function mergeWithDefaults(raw: unknown): unknown {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG;
  return {
    ratio: normalizeRatio(raw.ratio),
    intervention_strength:
      raw.intervention_strength ?? DEFAULT_CONFIG.intervention_strength,
    keywords: {
      ...DEFAULT_CONFIG.keywords,
      ...(isPlainObject(raw.keywords) ? raw.keywords : {}),
    },
    default_model: raw.default_model ?? DEFAULT_CONFIG.default_model,
    default_options: {
      ...DEFAULT_CONFIG.default_options,
      ...(isPlainObject(raw.default_options) ? raw.default_options : {}),
    },
    session_ttl_hours:
      raw.session_ttl_hours ?? DEFAULT_CONFIG.session_ttl_hours,
  };
}
