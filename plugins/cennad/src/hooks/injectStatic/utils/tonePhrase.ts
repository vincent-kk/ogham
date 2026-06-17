import type { InterventionStrength } from '../../shared/configTypes.js';

export function tonePhrase(strength: InterventionStrength): string {
  if (strength === -2)
    return 'very conservative — prefer Claude unless strongly indicated';
  if (strength === -1) return 'conservative — bias to Claude';
  if (strength === 1) return 'proactive — delegate when reasonable';
  if (strength === 2)
    return 'aggressive — delegate by default when any keyword matches';
  return 'balanced — follow ratio and keywords';
}
