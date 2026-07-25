import { rm } from 'node:fs/promises';

import { beforeEach, describe, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CENNAD_HOME } from '../../../constants/paths.js';
import { writeConfigFixture } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerA } from '../helpers/hookRunnerLayerA.js';

// Derived from DEFAULT_CONFIG so editing the shipped ratio or keyword lists does
// not drag these expectations along. Labels and stance wording stay literal —
// those are the payload spec under test, not defaults.
const { ratio: RATIO, keywords: KEYWORDS } = DEFAULT_CONFIG;
const RATIO_LINE = `Provider ratio: codex ${RATIO.codex.value}% · antigravity ${RATIO.antigravity.value}% · claude ${RATIO.claude.value}%`;

describe('injectStatic (Layer A)', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('default payload — all enabled, balanced', () => {
    const result = runHookLayerA('injectStatic');
    assertHookEnvelope(result, {
      event: 'SessionStart',
      contextIncludes: [
        RATIO_LINE,
        'Active providers: codex, antigravity, claude',
        // the host's own model stays a crosscheck participant, not an auto-route
        'Auto-routing: codex, antigravity',
        `Intervention strength: ${DEFAULT_CONFIG.intervention_strength} (neutral)`,
        `- ${KEYWORDS.codex} → \`/cennad:codex\``,
        `- ${KEYWORDS.claude} → \`/cennad:claude\` (crosscheck only — this session's own model)`,
        '- a claim worth an independent second opinion → `/cennad:crosscheck`',
      ],
    });
  });

  it('custom config reflects ratio 30/70 and intervention -2', async () => {
    await writeConfigFixture('custom');
    const result = runHookLayerA('injectStatic');
    assertHookEnvelope(result, {
      event: 'SessionStart',
      contextIncludes: [
        'codex 30%',
        'antigravity 70%',
        'Intervention strength: -2 (subtle)',
        'Dispatch only when the user asks for a provider by name.',
        '- research, news → `/cennad:antigravity`',
        '- code, tests → `/cennad:codex`',
      ],
    });
  });

  it('disabled providers — Active providers: none — run /setup', async () => {
    await writeConfigFixture('disabled');
    const result = runHookLayerA('injectStatic');
    assertHookEnvelope(result, {
      event: 'SessionStart',
      contextIncludes: ['Active providers: none — run /setup'],
    });
  });

  it('corrupt config — loadConfig fallback yields default payload (loader-only)', async () => {
    await writeConfigFixture('corrupt');
    const result = runHookLayerA('injectStatic');
    assertHookEnvelope(result, {
      event: 'SessionStart',
      contextIncludes: [
        RATIO_LINE,
        'Active providers: codex, antigravity, claude',
      ],
    });
  });
});
