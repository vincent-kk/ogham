import type { InterventionStrength } from './configTypes.js';
import { DEFAULTS } from './defaults.js';

export function pickStrength(v: unknown): InterventionStrength {
  if (v === -2 || v === -1 || v === 0 || v === 1 || v === 2) return v;
  return DEFAULTS.intervention_strength;
}
