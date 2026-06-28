import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import { writeConfigFixture } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerB } from '../helpers/hookRunnerLayerB.js';

describe('injectStatic (Layer B)', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('default payload + exit 0 + stdout JSON envelope', () => {
    const result = runHookLayerB('injectStatic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'SessionStart',
      contextIncludes: [
        'Provider ratio: codex 34% · antigravity 33% · claude 33%',
        'Active providers: codex, antigravity, claude',
        'balanced',
      ],
    });
  });

  it('custom config reflected through bundled loader', async () => {
    await writeConfigFixture('custom');
    const result = runHookLayerB('injectStatic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'SessionStart',
      contextIncludes: [
        'codex 30%',
        'antigravity 70%',
        'research, news',
        'very conservative',
      ],
    });
  });

  it('reads legacy config before MCP startup migrates plugin data', async () => {
    await writeConfigFixture('custom');
    const dataHome = await mkdtemp(join(tmpdir(), 'cennad-plugin-data-'));
    try {
      const result = runHookLayerB('injectStatic', {
        env: { CLAUDE_PLUGIN_DATA: dataHome },
      });
      expect(result.exitCode).toBe(0);
      assertHookEnvelope(result.parsed, {
        event: 'SessionStart',
        contextIncludes: ['codex 30%', 'antigravity 70%'],
      });
    } finally {
      await rm(dataHome, { recursive: true, force: true });
    }
  });

  it('disabled providers — Active providers: none — run /setup', async () => {
    await writeConfigFixture('disabled');
    const result = runHookLayerB('injectStatic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'SessionStart',
      contextIncludes: ['Active providers: none — run /setup'],
    });
  });

  it('corrupt config — entry try/catch still emits { continue: true } and exit 0', async () => {
    await writeConfigFixture('corrupt');
    const result = runHookLayerB('injectStatic');
    expect(result.exitCode).toBe(0);
    expect(result.parsed.continue).toBe(true);
  });
});
