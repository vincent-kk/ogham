import { rm } from 'node:fs/promises';

import { beforeEach, describe, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import { writeCounter, writeRawCounter } from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerA } from '../helpers/hookRunnerLayerA.js';
import {
  claimHostSession,
  HOST_SESSION_ID,
} from '../helpers/hostSession.js';

describe('injectDynamic (Layer A)', () => {
  beforeEach(async () => {
    claimHostSession();
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('no counter file — reports that this session has no data yet', () => {
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: ['Delegation counts unavailable (missing).'],
    });
  });

  it('with current-session counter — one state line plus the strength nudge', async () => {
    await writeCounter({
      host_session_id: HOST_SESSION_ID,
      codex: 7,
      antigravity: 3,
    });
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: [
        '[cennad] Calls: codex 7 · antigravity 3 · claude 0 (total 10)',
        // claude is the host's own model, so its gap is not auto-routable
        'under share: antigravity 3pt',
        'Weigh codex or antigravity against handling it here',
      ],
    });
  });

  it('stale counter (parent_pid mismatch) — reports an unavailable measurement', async () => {
    await writeCounter({
      parent_pid: 999999,
      codex: 99,
      antigravity: 99,
    });
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: ['Delegation counts unavailable (stale).'],
    });
  });

  it('corrupt counter — reports invalid measurement data', async () => {
    await writeRawCounter('{ this is :: invalid');
    const result = runHookLayerA('injectDynamic');
    assertHookEnvelope(result, {
      event: 'UserPromptSubmit',
      contextIncludes: ['Delegation counts unavailable (invalid).'],
    });
  });
});
