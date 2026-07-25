import type { InterventionStrength } from '../../shared/configTypes.js';
import type { HookProvider } from '../../shared/providerOrder.js';

// Added only on turns where a configured keyword actually matched. The matched
// keyword changes from turn to turn, which is what keeps this line readable as
// new information instead of decaying into wallpaper the way a fixed string does.
const TEMPLATES = {
  '-2': '<skill> available.',
  '-1': '<skill> if it owns most of this.',
  '0': '<skill> or here? Decide before starting.',
  '1': '<skill> owns this. Prefer it.',
  '2': '<skill> owns this. Dispatch before starting.',
} as const;

export function matchLine(
  strength: InterventionStrength,
  match: { provider: HookProvider; keyword: string },
): string {
  const tail = TEMPLATES[String(strength) as keyof typeof TEMPLATES].replace(
    '<skill>',
    `/cennad:${match.provider}`,
  );
  return `Matched "${match.keyword}" → ${tail}`;
}
