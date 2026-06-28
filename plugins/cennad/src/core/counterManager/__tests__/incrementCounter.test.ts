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

  it('starts claude count at 1 from empty state', async () => {
    const result = await incrementCounter('claude');
    expect(result).toEqual({
      parent_pid: 4242,
      claude: 1,
      codex: 0,
      antigravity: 0,
    });
  });

  it('starts codex count at 1 from empty state', async () => {
    const result = await incrementCounter('codex');
    expect(result).toEqual({
      parent_pid: 4242,
      claude: 0,
      codex: 1,
      antigravity: 0,
    });
  });

  it('starts antigravity count at 1 from empty state', async () => {
    const result = await incrementCounter('antigravity');
    expect(result).toEqual({
      parent_pid: 4242,
      claude: 0,
      codex: 0,
      antigravity: 1,
    });
  });

  it('accumulates across calls when parent_pid is stable', async () => {
    await incrementCounter('claude');
    await incrementCounter('claude');
    const result = await incrementCounter('codex');
    expect(result).toEqual({
      parent_pid: 4242,
      claude: 2,
      codex: 1,
      antigravity: 0,
    });
  });

  it('resets and restarts at 1 when parent_pid changes', async () => {
    await incrementCounter('claude');
    await incrementCounter('codex');
    ppidRef.value = 9999;
    const result = await incrementCounter('claude');
    expect(result).toEqual({
      parent_pid: 9999,
      claude: 1,
      codex: 0,
      antigravity: 0,
    });
  });

  it('persists the counter to disk', async () => {
    await incrementCounter('claude');
    const stored = JSON.parse(await readFile(COUNTER_PATH, 'utf8'));
    expect(stored).toEqual({
      parent_pid: 4242,
      claude: 1,
      codex: 0,
      antigravity: 0,
    });
  });
});
