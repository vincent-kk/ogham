import { readFile, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CENNAD_HOME, COUNTER_PATH } from '../../../constants/paths.js';
import { incrementCounter } from '../operations/incrementCounter.js';

const { identityRef } = vi.hoisted(() => ({
  identityRef: { value: null as string | null },
}));

vi.mock('../../../utils/hostSessionIdentity.js', () => ({
  resolveHostSessionIdentity: () => identityRef.value,
}));

describe('incrementCounter', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
    identityRef.value = 'session-a';
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('starts claude count at 1 from empty state', async () => {
    const result = await incrementCounter('claude');
    expect(result).toEqual({
      host_session_id: 'session-a',
      claude: 1,
      codex: 0,
      antigravity: 0,
    });
  });

  it('starts codex count at 1 from empty state', async () => {
    const result = await incrementCounter('codex');
    expect(result).toEqual({
      host_session_id: 'session-a',
      claude: 0,
      codex: 1,
      antigravity: 0,
    });
  });

  it('starts antigravity count at 1 from empty state', async () => {
    const result = await incrementCounter('antigravity');
    expect(result).toEqual({
      host_session_id: 'session-a',
      claude: 0,
      codex: 0,
      antigravity: 1,
    });
  });

  it('accumulates across calls when host_session_id is stable', async () => {
    await incrementCounter('claude');
    await incrementCounter('claude');
    const result = await incrementCounter('codex');
    expect(result).toEqual({
      host_session_id: 'session-a',
      claude: 2,
      codex: 1,
      antigravity: 0,
    });
  });

  it('resets and restarts at 1 when host_session_id changes', async () => {
    await incrementCounter('claude');
    await incrementCounter('codex');
    identityRef.value = 'session-b';
    const result = await incrementCounter('claude');
    expect(result).toEqual({
      host_session_id: 'session-b',
      claude: 1,
      codex: 0,
      antigravity: 0,
    });
  });

  it('persists the counter to disk', async () => {
    await incrementCounter('claude');
    const stored = JSON.parse(await readFile(COUNTER_PATH, 'utf8'));
    expect(stored).toEqual({
      host_session_id: 'session-a',
      claude: 1,
      codex: 0,
      antigravity: 0,
    });
  });

  it('does not write when the host session is unidentified', async () => {
    identityRef.value = null;
    expect(await incrementCounter('claude')).toBeNull();
    await expect(readFile(COUNTER_PATH, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
