import { readFile, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CENNAD_HOME, COUNTER_PATH } from '../../../constants/paths.js';
import { incrementCounter } from '../operations/incrementCounter.js';

const { ppidRef } = vi.hoisted(() => ({
  ppidRef: { value: 0 },
}));

vi.mock('../../../utils/parentPid.js', () => ({
  getParentPid: () => ppidRef.value,
}));

describe('incrementCounter', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
    ppidRef.value = 4242;
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('starts gemini count at 1 from empty state', async () => {
    const result = await incrementCounter('gemini');
    expect(result).toEqual({
      parent_pid: 4242,
      gemini: 1,
      codex: 0,
      antigravity: 0,
    });
  });

  it('starts codex count at 1 from empty state', async () => {
    const result = await incrementCounter('codex');
    expect(result).toEqual({
      parent_pid: 4242,
      gemini: 0,
      codex: 1,
      antigravity: 0,
    });
  });

  it('starts antigravity count at 1 from empty state', async () => {
    const result = await incrementCounter('antigravity');
    expect(result).toEqual({
      parent_pid: 4242,
      gemini: 0,
      codex: 0,
      antigravity: 1,
    });
  });

  it('accumulates across calls when parent_pid is stable', async () => {
    await incrementCounter('gemini');
    await incrementCounter('gemini');
    const result = await incrementCounter('codex');
    expect(result).toEqual({
      parent_pid: 4242,
      gemini: 2,
      codex: 1,
      antigravity: 0,
    });
  });

  it('resets and restarts at 1 when parent_pid changes', async () => {
    await incrementCounter('gemini');
    await incrementCounter('codex');
    ppidRef.value = 9999;
    const result = await incrementCounter('gemini');
    expect(result).toEqual({
      parent_pid: 9999,
      gemini: 1,
      codex: 0,
      antigravity: 0,
    });
  });

  it('persists the counter to disk', async () => {
    await incrementCounter('gemini');
    const stored = JSON.parse(await readFile(COUNTER_PATH, 'utf8'));
    expect(stored).toEqual({
      parent_pid: 4242,
      gemini: 1,
      codex: 0,
      antigravity: 0,
    });
  });
});
