import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME, sessionPath } from '../../../constants/paths.js';
import { getProjectHash } from '../../projectHash/index.js';
import { createSession } from '../operations/createSession.js';
import { getSession } from '../operations/getSession.js';

describe('getSession', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns the persisted session when hash and id match', async () => {
    const created = await createSession({
      provider: 'claude',
      cwd: '/proj/x',
      externalSessionRef: '0',
      model: 'claude-2.5-pro',
    });
    const loaded = await getSession(created.project_hash, created.session_id);
    expect(loaded).toEqual(created);
  });

  it('returns null when the session file is missing', async () => {
    const hash = getProjectHash('/proj/y');
    expect(
      await getSession(hash, '00000000-0000-4000-8000-000000000000'),
    ).toBeNull();
  });

  it('returns null when project_hash on disk does not match the lookup hash', async () => {
    const created = await createSession({
      provider: 'codex',
      cwd: '/proj/real',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    const otherHash = getProjectHash('/proj/other');
    const target = sessionPath(otherHash, created.session_id);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(created));

    expect(await getSession(otherHash, created.session_id)).toBeNull();
  });

  it('returns null when the file contains invalid JSON', async () => {
    const hash = getProjectHash('/proj/z');
    const target = sessionPath(hash, '11111111-1111-4111-8111-111111111111');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, '{not-json');
    expect(
      await getSession(hash, '11111111-1111-4111-8111-111111111111'),
    ).toBeNull();
  });

  it('returns null when the JSON does not satisfy the schema', async () => {
    const hash = getProjectHash('/proj/w');
    const target = sessionPath(hash, '22222222-2222-4222-8222-222222222222');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify({ session_id: 'not-a-uuid' }));
    expect(
      await getSession(hash, '22222222-2222-4222-8222-222222222222'),
    ).toBeNull();
  });
});
