import { rm } from 'node:fs/promises';

import { beforeEach, describe, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import { writeCounter, writeRawCounter } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerA } from '../helpers/hookRunnerLayerA.js';

describe('injectDynamic (Layer A)', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
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
      gemini: 3,
      codex: 7,
    });
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: [
        'Calls this session: gemini 3 · codex 7 · total 10',
        'gemini 30%',
        'codex 70%',
        'Drift:',
      ],
    });
  });

  it('stale counter (parent_pid mismatch) — treated as 0/0', async () => {
    await writeCounter({
      parent_pid: 999999,
      gemini: 99,
      codex: 99,
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
