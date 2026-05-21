import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { InterventionStrength } from './configTypes.js';

export function pickStrength(v: unknown): InterventionStrength {
  if (v === -2 || v === -1 || v === 0 || v === 1 || v === 2) return v;
  return DEFAULT_CONFIG.intervention_strength;
}
