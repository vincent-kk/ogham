import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import type { SessionMeta } from '../../../types/index.js';
import { createSession } from '../operations/createSession.js';
import { getSession } from '../operations/getSession.js';
import { updateSession } from '../operations/updateSession.js';

describe('updateSession', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('overwrites the session JSON with the provided meta', async () => {
    const created = await createSession({
      provider: 'gemini',
      cwd: '/proj/u',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
    });
    const next: SessionMeta = {
      ...created,
      turn_count: created.turn_count + 1,
      last_used_at: '2030-01-01T00:00:00.000Z',
    };
    const returned = await updateSession(next);
    expect(returned).toEqual(next);
    const loaded = await getSession(created.project_hash, created.session_id);
    expect(loaded).toEqual(next);
  });

  it('rejects invalid meta via the Zod schema', async () => {
    const created = await createSession({
      provider: 'codex',
      cwd: '/proj/v',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    await expect(
      updateSession({
        ...created,
        turn_count: -1,
      }),
    ).rejects.toThrow();
  });
});
