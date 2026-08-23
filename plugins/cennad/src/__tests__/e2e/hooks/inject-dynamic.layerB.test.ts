import { rm } from 'node:fs/promises';

import { beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import {
  writeCounter,
  writeRawConfig,
  writeRawCounter,
} from '../helpers/diskAssert.js';
import { assertHookEnvelope } from '../helpers/envelopeShape.js';
import { runHookLayerB } from '../helpers/hookRunnerLayerB.js';
import { HOST_SESSION_ID, claimHostSession } from '../helpers/hostSession.js';

// Shipped keywords are ASCII, so the non-ASCII substring path only exists for
// keywords a user configures — this suite configures one rather than leaning on
// a default that may change.
const NON_ASCII_KEYWORD = '코드';

describe('injectDynamic (Layer B)', () => {
  beforeEach(async () => {
    claimHostSession();
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('no counter — reports no session data + exit 0', () => {
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: ['Delegation counts unavailable (missing).'],
    });
  });

  it('with current-session counter — condensed state + nudge', async () => {
    await writeCounter({
      host_session_id: HOST_SESSION_ID,
      codex: 7,
      antigravity: 3,
    });
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: [
        '[cennad] Calls: codex 7 · antigravity 3 · claude 0 (total 10)',
        'under share: antigravity 3pt',
        'Weigh codex or antigravity against handling it here',
      ],
    });
  });

  it('reads the stdin prompt and names the owner of a non-ASCII keyword', async () => {
    await writeRawConfig(
      JSON.stringify({ keywords: { codex: NON_ASCII_KEYWORD } }),
    );
    const result = runHookLayerB('injectDynamic', {
      input: JSON.stringify({
        session_id: 'e2e',
        prompt: `이 ${NON_ASCII_KEYWORD}를 고쳐줘`,
        cwd: process.cwd(),
      }),
    });
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      // substring matching is what carries the attached particle in "코드를"
      contextIncludes: [`Matched "${NON_ASCII_KEYWORD}" → /cennad:codex`],
    });
  });

  it('stale counter (parent_pid mismatch) — reports unavailable', async () => {
    await writeCounter({
      parent_pid: 999999,
      codex: 99,
      antigravity: 99,
    });
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    assertHookEnvelope(result.parsed, {
      event: 'UserPromptSubmit',
      contextIncludes: ['Delegation counts unavailable (stale).'],
    });
  });

  it('corrupt counter — entry try/catch still { continue: true } + exit 0', async () => {
    await writeRawCounter('{ broken');
    const result = runHookLayerB('injectDynamic');
    expect(result.exitCode).toBe(0);
    expect(result.parsed.continue).toBe(true);
    expect(result.parsed.additionalContext).toContain(
      'Delegation counts unavailable (invalid).',
    );
  });
});
