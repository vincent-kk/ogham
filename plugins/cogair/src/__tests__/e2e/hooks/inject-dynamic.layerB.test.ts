import { rm } from 'node:fs/promises';

import { beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import { writeCounter, writeRawCounter } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerB } from '../helpers/hookRunnerLayerB.js';

describe('injectDynamic (Layer B)', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('no counter — "No calls this session yet." + exit 0', () => {
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: ['No calls this session yet.'],
    });
  });

  it('with counter (parent_pid = worker pid) — total/current/target', async () => {
    await writeCounter({
      parent_pid: process.pid,
      gemini: 3,
      codex: 7,
    });
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: [
        'Calls this session: gemini 3 · codex 7 · total 10',
        'gemini 30%',
        'codex 70%',
      ],
    });
  });

  it('stale counter (parent_pid mismatch) — treated as 0/0', async () => {
    await writeCounter({
      parent_pid: 999999,
      gemini: 99,
      codex: 99,
    });
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: ['No calls this session yet.'],
    });
  });

  it('corrupt counter — entry try/catch still { continue: true } + exit 0', async () => {
    await writeRawCounter('{ broken');
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    expect(result.parsed.continue).toBe(true);
  });
});
