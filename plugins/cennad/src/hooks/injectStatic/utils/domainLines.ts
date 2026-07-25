import type { Keywords } from '../../shared/configTypes.js';
import type { HookProvider } from '../../shared/providerOrder.js';

import { joinKeywords } from './joinKeywords.js';

// Shown when a provider's keyword string is blank, so clearing keywords in the
// settings UI never erases what the provider is for.
const DEFAULT_DOMAIN = {
  codex: 'heavy code, refactor, sandboxed shell',
  antigravity: 'live web search, very large context',
  claude: 'reasoning, writing, analysis, review',
} as const;

// Every enabled provider is listed, including the ones hooks may not elect —
// they stay reachable through crosscheck and by name, so hiding them would cost
// the reader a route. The suffix says which kind of exclusion applies.
export function domainLines(
  keywords: Keywords,
  active: readonly HookProvider[],
  electable: readonly HookProvider[],
  self: HookProvider,
): string[] {
  if (active.length === 0) return [];

  const lines = ['Domains with owners'];
  for (const p of active) {
    const domain = joinKeywords(keywords[p], DEFAULT_DOMAIN[p]);
    const suffix = electable.includes(p)
      ? ''
      : p === self
        ? " (crosscheck only — this session's own model)"
        : ' (crosscheck only — by setup)';
    lines.push(`- ${domain} → \`/cennad:${p}\`${suffix}`);
  }
  if (active.length > 1)
    lines.push(
      '- a claim worth an independent second opinion → `/cennad:crosscheck`',
    );
  return lines;
}
