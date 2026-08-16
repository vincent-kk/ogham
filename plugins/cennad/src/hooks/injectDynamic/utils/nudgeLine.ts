import type { InterventionStrength } from '../../shared/configTypes.js';
import type { HookProvider } from '../../shared/providerOrder.js';

import { providerList } from './providerList.js';

// One short reminder, re-injected every turn. It names the electable providers
// rather than a `<provider>` placeholder: the SessionStart block that would
// explain a placeholder is injected once and can fall out of a compacted
// context, while this line is the only text that comes back every turn.
const NUDGES = {
  '-2': 'Delegate to <list> only when asked by name.',
  '-1': 'Delegate only when <list> owns most of this work.',
  '0': 'Weigh <list> against handling it here — decide before you start.',
  '1': 'Prefer <list> over handling owned work here.',
  '2': 'Dispatch owned work to <list>; split mixed tasks; keeping one needs a listed exception.',
} as const;

export function nudgeLine(
  strength: InterventionStrength,
  electable: readonly HookProvider[],
): string {
  return NUDGES[String(strength) as keyof typeof NUDGES].replace(
    '<list>',
    providerList(electable),
  );
}
