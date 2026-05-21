import type { HookConfig } from '../shared/configTypes.js';

import { joinKeywords } from './utils/joinKeywords.js';
import { tonePhrase } from './utils/tonePhrase.js';

export function buildStaticPayload(config: HookConfig): string {
  const r = config.ratio;
  const active: string[] = [];
  if (r.gemini.enabled) active.push('gemini');
  if (r.codex.enabled) active.push('codex');
  const activeLine =
    active.length === 0 ? 'none — run /setup' : active.join(', ');

  const options = JSON.stringify(config.default_options);

  return [
    '[cogair] Static policy',
    '',
    `Provider ratio: gemini ${r.gemini.value}% · codex ${r.codex.value}%`,
    `Active providers: ${activeLine}`,
    `Intervention strength: ${config.intervention_strength} (${tonePhrase(config.intervention_strength)})`,
    '',
    'Keyword mapping',
    `- gemini → ${joinKeywords(config.keywords.gemini)}`,
    `- codex  → ${joinKeywords(config.keywords.codex)}`,
    '',
    'Routing guidance',
    `- Default model alias: ${config.default_model}`,
    `- Default options:    ${options}`,
    "- Delegate when (a) a keyword matches the provider's domain,",
    "  (b) the task suits the provider's strength (gemini: live search, large context;",
    '  codex: heavy code, sandboxed shell), or',
    '  (c) keeping near the configured ratio.',
    '- Fall back to Claude when neither provider clearly fits.',
    '- Use /codex and /gemini skills, never invoke CLI binaries directly.',
  ].join('\n');
}
