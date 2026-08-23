import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import { incrementCounter } from '../../../core/counterManager/index.js';
import { readCounter, writeCounter } from '../helpers/diskAssert.js';
import { runHookLayerB } from '../helpers/hookRunnerLayerB.js';

const originalExplicitIdentity = process.env.CENNAD_HOST_SESSION_ID;
const originalClaudePid = process.env.CLAUDE_PID;

function restoreEnv(): void {
  if (originalExplicitIdentity === undefined)
    delete process.env.CENNAD_HOST_SESSION_ID;
  else process.env.CENNAD_HOST_SESSION_ID = originalExplicitIdentity;
  if (originalClaudePid === undefined) delete process.env.CLAUDE_PID;
  else process.env.CLAUDE_PID = originalClaudePid;
}

function dynamicContext(topology: 'direct' | 'launcher'): string {
  return (
    runHookLayerB('injectDynamic', { topology }).parsed.additionalContext ?? ''
  );
}

describe('counter host session identity (Layer B)', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
    process.env.CENNAD_HOST_SESSION_ID = 'codex-fixture';
    delete process.env.CLAUDE_PID;
  });

  afterEach(async () => {
    restoreEnv();
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('preserves 4/2/1 counts through direct and launcher topologies', async () => {
    for (let i = 0; i < 4; i += 1) await incrementCounter('codex');
    for (let i = 0; i < 2; i += 1) await incrementCounter('antigravity');
    await incrementCounter('claude');

    const expected =
      '[cennad] Calls: codex 4 · antigravity 2 · claude 1 (total 7)';
    expect(dynamicContext('direct')).toContain(expected);
    expect(dynamicContext('launcher')).toContain(expected);
  });

  it('keeps an unidentified producer and both hook topologies unmeasured', async () => {
    delete process.env.CENNAD_HOST_SESSION_ID;
    expect(await incrementCounter('codex')).toBeNull();
    expect(await readCounter()).toBeNull();
    expect(dynamicContext('direct')).toContain(
      'Delegation counts unavailable (unidentified).',
    );
    expect(dynamicContext('launcher')).toContain(
      'Delegation counts unavailable (unidentified).',
    );
  });

  it('preserves the measured-zero experience for a matching identity', async () => {
    await writeCounter({ host_session_id: 'codex-fixture' });
    expect(dynamicContext('launcher')).toContain(
      'No delegations yet this session.',
    );
  });

  it('retains the CLAUDE_PID compatibility path', async () => {
    delete process.env.CENNAD_HOST_SESSION_ID;
    process.env.CLAUDE_PID = '4242';
    await incrementCounter('claude');
    expect(dynamicContext('launcher')).toContain(
      '[cennad] Calls: codex 0 · antigravity 0 · claude 1 (total 1)',
    );
  });
});
