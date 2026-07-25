import type { Keywords } from '../../shared/configTypes.js';
import type { HookProvider } from '../../shared/providerOrder.js';

import { hasWordBoundaryMatch } from './hasWordBoundaryMatch.js';
import { isAsciiOnly } from './isAsciiOnly.js';

export interface DomainMatch {
  provider: HookProvider;
  keyword: string;
}

// Which electable provider owns this turn, decided from the user's own keyword
// lists. Ties break by `electable` order, then by the order the user wrote the
// keywords in — their ordering is the priority they intended.
//
// No regex anywhere: keywords are user-authored, so "c++" or "node(js)" would
// otherwise need escaping. ASCII keywords are boundary-checked; a keyword
// carrying any non-ASCII character matches as a plain substring, which is what
// makes Korean work — particles attach straight onto the noun ("코드를"), so a
// boundary check would never fire.
export function matchDomain(
  prompt: string,
  keywords: Keywords,
  electable: readonly HookProvider[],
): DomainMatch | null {
  const folded = prompt.toLowerCase();

  for (const provider of electable)
    for (const entry of keywords[provider].split(',')) {
      const keyword = entry.trim();
      if (keyword === '') continue;

      const needle = keyword.toLowerCase();
      const hit = isAsciiOnly(keyword)
        ? hasWordBoundaryMatch(folded, needle)
        : folded.includes(needle);
      if (hit) return { provider, keyword };
    }

  return null;
}
