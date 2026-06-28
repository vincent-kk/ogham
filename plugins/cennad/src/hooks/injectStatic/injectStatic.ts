import { activeGoogleEngine } from '../shared/activeGoogleEngine.js';
import type { HookConfig } from '../shared/configTypes.js';

import { joinKeywords } from './utils/joinKeywords.js';
import { tonePhrase } from './utils/tonePhrase.js';

export function buildStaticPayload(config: HookConfig): string {
  const r = config.ratio;
  const google = activeGoogleEngine(config);
  const googleName = google ?? 'antigravity';
  const googleValue = google ? r[google].value : 0;

  const active: string[] = [];
  if (google) active.push(google);
  if (r.codex.enabled) active.push('codex');
  const activeLine =
    active.length === 0 ? 'none — run /setup' : active.join(', ');
  const skillList = active.map((p) => `/cennad:${p}`).join(' and ');

  const flags = JSON.stringify(config.option_flags);

  const keywordLines = ['Keyword mapping'];
  if (google)
    keywordLines.push(`- ${google} → ${joinKeywords(config.keywords[google])}`);
  if (r.codex.enabled)
    keywordLines.push(`- codex  → ${joinKeywords(config.keywords.codex)}`);

  return [
    '[cennad] Static policy',
    '',
    `Provider ratio: ${googleName} ${googleValue}% · codex ${r.codex.value}%`,
    `Active providers: ${activeLine}`,
    `Intervention strength: ${config.intervention_strength} (${tonePhrase(config.intervention_strength)})`,
    '',
    ...keywordLines,
    '',
    'Routing guidance',
    `- Option flags:        ${flags}`,
    "- Delegate when (a) a keyword matches the provider's domain,",
    "  (b) the task suits the provider's strength (antigravity: live search, large context;",
    '  codex: heavy code, sandboxed shell), or',
    '  (c) keeping near the configured ratio.',
    '- Fall back to Claude when neither provider clearly fits.',
    active.length === 0
      ? '- Run /cennad:setup to enable a provider before delegating.'
      : `- Use ${skillList} skill${active.length > 1 ? 's' : ''}, never invoke CLI binaries directly.`,
  ].join('\n');
}
