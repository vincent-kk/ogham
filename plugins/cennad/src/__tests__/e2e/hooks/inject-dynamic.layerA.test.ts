import { rm } from 'node:fs/promises';

import { beforeEach, describe, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import { writeCounter, writeRawCounter } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerA } from '../helpers/hookRunnerLayerA.js';

describe('injectDynamic (Layer A)', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('no counter file — "No calls this session yet."', () => {
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: ['No calls this session yet.'],
    });
  });

  it('with counter — total + current + target + drift', async () => {
    await writeCounter({
      parent_pid: process.ppid,
      codex: 7,
      antigravity: 3,
    });
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: [
        'Calls this session: codex 7 · antigravity 3 · claude 0 · total 10',
        'codex 70%',
        'antigravity 30%',
        'Drift:',
      ],
    });
  });

  it('stale counter (parent_pid mismatch) — treated as 0/0', async () => {
    await writeCounter({
      parent_pid: 999999,
      codex: 99,
      antigravity: 99,
    });
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: ['No calls this session yet.'],
    });
  });

  it('corrupt counter — loadCounter fallback yields 0/0 (loader-only)', async () => {
    await writeRawCounter('{ this is :: invalid');
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: ['No calls this session yet.'],
    });
  });
});
