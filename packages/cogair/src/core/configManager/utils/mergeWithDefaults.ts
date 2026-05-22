import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';
import { mergeArtifacts } from './mergeArtifacts.js';
import { mergeOptionFlags } from './mergeOptionFlags.js';
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
    option_flags: mergeOptionFlags(raw.option_flags),
    session_ttl_hours:
      raw.session_ttl_hours ?? DEFAULT_CONFIG.session_ttl_hours,
    artifacts: mergeArtifacts(raw.artifacts),
  };
}
