import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CENNAD_HOME, COUNTER_PATH } from '../../../constants/paths.js';
import { getCounter } from '../operations/getCounter.js';

const { identityRef } = vi.hoisted(() => ({
  identityRef: { value: null as string | null },
}));

vi.mock('../../../utils/hostSessionIdentity.js', () => ({
  resolveHostSessionIdentity: () => identityRef.value,
}));

async function writeCounterFile(content: string): Promise<void> {
  await mkdir(dirname(COUNTER_PATH), { recursive: true });
  await writeFile(COUNTER_PATH, content);
}

describe('getCounter', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
    identityRef.value = 'session-a';
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns a fresh counter when nothing is persisted', async () => {
    expect(await getCounter()).toEqual({
      host_session_id: 'session-a',
      claude: 0,
      codex: 0,
      antigravity: 0,
    });
  });

  it('returns the persisted counter when host_session_id matches', async () => {
    await writeCounterFile(
      JSON.stringify({
        host_session_id: 'session-a',
        claude: 4,
        codex: 2,
        antigravity: 1,
      }),
    );
    expect(await getCounter()).toEqual({
      host_session_id: 'session-a',
      claude: 4,
      codex: 2,
      antigravity: 1,
    });
  });

  it('resets to zeros when host_session_id no longer matches', async () => {
    await writeCounterFile(
      JSON.stringify({
        host_session_id: 'session-b',
        claude: 7,
        codex: 3,
        antigravity: 2,
      }),
    );
    expect(await getCounter()).toEqual({
      host_session_id: 'session-a',
      claude: 0,
      codex: 0,
      antigravity: 0,
    });
  });

  it('treats invalid counter.json as missing', async () => {
    await writeCounterFile('garbage');
    expect(await getCounter()).toEqual({
      host_session_id: 'session-a',
      claude: 0,
      codex: 0,
      antigravity: 0,
    });
  });

  it('returns unidentified instead of a synthetic zero counter', async () => {
    identityRef.value = null;
    expect(await getCounter()).toBeNull();
  });
});
