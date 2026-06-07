import { rm } from 'node:fs/promises';

import { beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import { writeConfigFixture, writeCounter } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerA } from '../helpers/hookRunnerLayerA.js';
import { runHookLayerB } from '../helpers/hookRunnerLayerB.js';

describe('legacy ratio migration (both layers)', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    await writeConfigFixture('legacy');
  });

  it('Layer A injectStatic migrates integer {gemini:3, codex:7} → 30%/70%', () => {
    const result = runHookLayerA('injectStatic');
    assertHookEnvelope(result, {
      event: 'SessionStart',
      contextIncludes: ['Provider ratio: gemini 30% · codex 70%'],
    });
  });

  it('Layer A injectDynamic shows target ratio 30%/70% from migrated config', async () => {
    await writeCounter({ parent_pid: process.ppid, gemini: 1, codex: 1 });
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: ['Target ratio:', 'gemini 30%', 'codex 70%'],
    });
  });

  it('Layer B injectStatic migrates legacy ratio via bundled loader', () => {
    const result = runHookLayerB('injectStatic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'SessionStart',
      contextIncludes: ['Provider ratio: gemini 30% · codex 70%'],
    });
  });

  it('Layer B injectDynamic with counter shows target 30%/70%', async () => {
    await writeCounter({ parent_pid: process.pid, gemini: 1, codex: 1 });
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: ['Target ratio:', 'gemini 30%', 'codex 70%'],
    });
  });
});
