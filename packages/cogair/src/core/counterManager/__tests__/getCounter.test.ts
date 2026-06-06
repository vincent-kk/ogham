import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COGAIR_HOME, COUNTER_PATH } from '../../../constants/paths.js';
import { getCounter } from '../operations/getCounter.js';

const { ppidRef } = vi.hoisted(() => ({
  ppidRef: { value: 0 },
}));

vi.mock('../../../utils/parentPid.js', () => ({
  getParentPid: () => ppidRef.value,
}));

async function writeCounterFile(content: string): Promise<void> {
  await mkdir(dirname(COUNTER_PATH), { recursive: true });
  await writeFile(COUNTER_PATH, content);
}

describe('getCounter', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    ppidRef.value = 12345;
  });

  afterEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('returns a fresh counter when nothing is persisted', async () => {
    expect(await getCounter()).toEqual({
      parent_pid: 12345,
      gemini: 0,
      codex: 0,
      antigravity: 0,
    });
  });

  it('returns the persisted counter when parent_pid matches', async () => {
    await writeCounterFile(
      JSON.stringify({
        parent_pid: 12345,
        gemini: 4,
        codex: 2,
        antigravity: 1,
      }),
    );
    expect(await getCounter()).toEqual({
      parent_pid: 12345,
      gemini: 4,
      codex: 2,
      antigravity: 1,
    });
  });

  it('resets to zeros when parent_pid no longer matches', async () => {
    await writeCounterFile(
      JSON.stringify({
        parent_pid: 99999,
        gemini: 7,
        codex: 3,
        antigravity: 2,
      }),
    );
    expect(await getCounter()).toEqual({
      parent_pid: 12345,
      gemini: 0,
      codex: 0,
      antigravity: 0,
    });
  });

  it('treats invalid counter.json as missing', async () => {
    await writeCounterFile('garbage');
    expect(await getCounter()).toEqual({
      parent_pid: 12345,
      gemini: 0,
      codex: 0,
      antigravity: 0,
    });
  });
});
