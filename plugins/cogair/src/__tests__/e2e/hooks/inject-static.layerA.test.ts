import { rm } from 'node:fs/promises';

import { beforeEach, describe, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import { writeConfigFixture } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerA } from '../helpers/hookRunnerLayerA.js';

describe('injectStatic (Layer A)', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('default payload — 50/50 enabled, balanced', () => {
    const result = runHookLayerA('injectStatic');
    assertHookEnvelope(result, {
      event: 'SessionStart',
      contextIncludes: [
        'Provider ratio: gemini 50% · codex 50%',
        'Active providers: gemini, codex',
        'Intervention strength: 0',
        'balanced',
      ],
    });
  });

  it('custom config reflects ratio 70/30 and intervention -2', async () => {
    await writeConfigFixture('custom');
    const result = runHookLayerA('injectStatic');
    assertHookEnvelope(result, {
      event: 'SessionStart',
      contextIncludes: [
        'Provider ratio: gemini 70% · codex 30%',
        'Intervention strength: -2',
        'very conservative',
        'research, news',
        'code, tests',
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
        'Provider ratio: gemini 50% · codex 50%',
        'Active providers: gemini, codex',
      ],
    });
  });
});
