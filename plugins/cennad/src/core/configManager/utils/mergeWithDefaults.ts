import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';
import { mergeAddons } from './mergeAddons.js';
import { mergeArtifacts } from './mergeArtifacts.js';
import { mergeDefaultTier } from './mergeDefaultTier.js';
import { mergeModelMap } from './mergeModelMap.js';
import { mergeOptionFlags } from './mergeOptionFlags.js';
import { mergePreamble } from './mergePreamble.js';
import { mergeRecencyFactor } from './mergeRecencyFactor.js';
import { normalizeMutualExclusion } from './normalizeMutualExclusion.js';
import { normalizeRatio } from './normalizeRatio.js';

export function mergeWithDefaults(raw: unknown): unknown {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG;
  return {
    ratio: normalizeMutualExclusion(normalizeRatio(raw.ratio)),
    intervention_strength:
      raw.intervention_strength ?? DEFAULT_CONFIG.intervention_strength,
    keywords: {
      ...DEFAULT_CONFIG.keywords,
      ...(isPlainObject(raw.keywords) ? raw.keywords : {}),
    },
    option_flags: mergeOptionFlags(raw.option_flags),
    model_map: mergeModelMap(raw.model_map),
    default_tier: mergeDefaultTier(raw.default_tier),
    session_ttl_hours:
      raw.session_ttl_hours ?? DEFAULT_CONFIG.session_ttl_hours,
    spawn_timeout_ms: raw.spawn_timeout_ms ?? DEFAULT_CONFIG.spawn_timeout_ms,
    artifacts: mergeArtifacts(raw.artifacts),
    preamble: mergePreamble(raw.preamble),
    recency_factor: mergeRecencyFactor(raw.recency_factor),
    addons: mergeAddons(raw.addons, raw.antigravity_youtube),
  };
}
