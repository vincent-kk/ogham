import type { HookConfig } from '../shared/configTypes.js';
import { PROVIDER_ORDER } from '../shared/providerOrder.js';

import { joinKeywords } from './utils/joinKeywords.js';
import { tonePhrase } from './utils/tonePhrase.js';

export function buildStaticPayload(config: HookConfig): string {
  const r = config.ratio;
  const active = PROVIDER_ORDER.filter((p) => r[p].enabled);
  const ratioLine = PROVIDER_ORDER.map((p) => `${p} ${r[p].value}%`).join(
    ' · ',
  );
  const activeLine =
    active.length === 0 ? 'none — run /setup' : active.join(', ');
  const skillList = active.map((p) => `/cennad:${p}`).join(' and ');

  const flags = JSON.stringify(config.option_flags);

  const keywordLines = ['Keyword mapping'];
  for (const p of active)
    keywordLines.push(`- ${p} → ${joinKeywords(config.keywords[p])}`);

  return [
    '[cennad] Static policy',
    '',
    `Provider ratio: ${ratioLine}`,
    `Active providers: ${activeLine}`,
    `Intervention strength: ${config.intervention_strength} (${tonePhrase(config.intervention_strength)})`,
    '',
    ...keywordLines,
    '',
    'Routing guidance',
    `- Option flags:        ${flags}`,
    "- Delegate when (a) a keyword matches the provider's domain,",
    "  (b) the task suits the provider's strength (codex: heavy code, sandboxed shell;",
    '  antigravity: live search, large context; claude: reasoning, writing, analysis), or',
    '  (c) keeping near the configured ratio.',
    '- Otherwise handle the task directly in this session.',
    active.length === 0
      ? '- Run /cennad:setup to enable a provider before delegating.'
      : `- Use ${skillList} skill${active.length > 1 ? 's' : ''}, never invoke CLI binaries directly.`,
  ].join('\n');
}
