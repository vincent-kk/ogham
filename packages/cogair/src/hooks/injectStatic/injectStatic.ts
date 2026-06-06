import { activeGoogleEngine } from '../shared/activeGoogleEngine.js';
import type { HookConfig } from '../shared/configTypes.js';

import { joinKeywords } from './utils/joinKeywords.js';
import { tonePhrase } from './utils/tonePhrase.js';

export function buildStaticPayload(config: HookConfig): string {
  const r = config.ratio;
  // gemini and antigravity are mutually exclusive; show only the active engine.
  const google = activeGoogleEngine(config);
  const googleName = google ?? 'gemini/antigravity';
  const googleValue = google ? r[google].value : 0;

  const active: string[] = [];
  if (google) active.push(google);
  if (r.codex.enabled) active.push('codex');
  const activeLine =
    active.length === 0 ? 'none — run /setup' : active.join(', ');

  const flags = JSON.stringify(config.option_flags);

  const keywordLines = ['Keyword mapping'];
  if (google) {
    keywordLines.push(`- ${google} → ${joinKeywords(config.keywords[google])}`);
  }
  keywordLines.push(`- codex  → ${joinKeywords(config.keywords.codex)}`);

  return [
    '[cogair] Static policy',
    '',
    `Provider ratio: ${googleName} ${googleValue}% · codex ${r.codex.value}%`,
    `Active providers: ${activeLine}`,
    `Intervention strength: ${config.intervention_strength} (${tonePhrase(config.intervention_strength)})`,
    '',
    ...keywordLines,
    '',
    'Routing guidance',
    `- Default model alias: ${config.default_model}`,
    `- Option flags:        ${flags}`,
    "- Delegate when (a) a keyword matches the provider's domain,",
    "  (b) the task suits the provider's strength (gemini/antigravity: live search, large context;",
    '  codex: heavy code, sandboxed shell), or',
    '  (c) keeping near the configured ratio.',
    '- Fall back to Claude when neither provider clearly fits.',
    `- Use /cogair:codex and /cogair:${google ?? 'gemini'} skills, never invoke CLI binaries directly.`,
  ].join('\n');
}
