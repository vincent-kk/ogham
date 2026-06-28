import { rm } from 'node:fs/promises';

import { beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import { writeCounter, writeRawCounter } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerB } from '../helpers/hookRunnerLayerB.js';

describe('injectDynamic (Layer B)', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
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
      codex: 7,
      antigravity: 3,
    });
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: [
        'Calls this session: codex 7 · antigravity 3 · claude 0 · total 10',
        'codex 70%',
        'antigravity 30%',
      ],
    });
  });

  it('stale counter (parent_pid mismatch) — treated as 0/0', async () => {
    await writeCounter({
      parent_pid: 999999,
      codex: 99,
      antigravity: 99,
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
