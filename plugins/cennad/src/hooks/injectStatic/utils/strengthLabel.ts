import type { InterventionStrength } from '../../shared/configTypes.js';

// Matches the settings slider ticks so the injected header and the UI read the
// same. The behavioral instruction lives in routingStance, not in this label.
const LABELS = {
  '-2': 'subtle',
  '-1': 'soft',
  '0': 'neutral',
  '1': 'active',
  '2': 'strong',
} as const;

export function strengthLabel(strength: InterventionStrength): string {
  return LABELS[String(strength) as keyof typeof LABELS];
}
