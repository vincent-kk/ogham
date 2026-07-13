import { readFile, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CENNAD_HOME,
  projectMetaPath,
  sessionPath,
} from '../../../constants/paths.js';
import { getProjectHash } from '../../projectHash/index.js';
import { createSession } from '../operations/createSession.js';

describe('createSession', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns a session with a generated UUID and the expected fields', async () => {
    const meta = await createSession({
      provider: 'claude',
      cwd: '/proj/a',
      externalSessionRef: '0',
      model: 'claude-2.5-pro',
      options: {},
    });
    expect(meta.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(meta.provider).toBe('claude');
    expect(meta.cwd).toBe('/proj/a');
    expect(meta.project_hash).toBe(getProjectHash('/proj/a'));
    expect(meta.turn_count).toBe(1);
    expect(meta.created_at).toBe(meta.last_used_at);
  });

  it('persists the session JSON under sessions/<hash>/<id>.json', async () => {
    const meta = await createSession({
      provider: 'codex',
      cwd: '/proj/b',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    const file = sessionPath(meta.project_hash, meta.session_id);
    const stored = JSON.parse(await readFile(file, 'utf8'));
    expect(stored).toEqual(meta);
  });

  it('writes _meta.json on the first session in a project', async () => {
    const meta = await createSession({
      provider: 'claude',
      cwd: '/proj/c',
      externalSessionRef: '0',
      model: 'claude-2.5-pro',
    });
    const stored = JSON.parse(
      await readFile(projectMetaPath(meta.project_hash), 'utf8'),
    );
    expect(stored.cwd).toBe('/proj/c');
    expect(typeof stored.created_at).toBe('string');
  });

  it('keeps the original _meta.json across subsequent sessions in the same project', async () => {
    const first = await createSession({
      provider: 'claude',
      cwd: '/proj/d',
      externalSessionRef: '0',
      model: 'claude-2.5-pro',
    });
    const firstMeta = JSON.parse(
      await readFile(projectMetaPath(first.project_hash), 'utf8'),
    );
    await new Promise((r) => setTimeout(r, 5));
    await createSession({
      provider: 'codex',
      cwd: '/proj/d',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    const secondMeta = JSON.parse(
      await readFile(projectMetaPath(first.project_hash), 'utf8'),
    );
    expect(secondMeta).toEqual(firstMeta);
  });

  it('defaults options to {} when omitted', async () => {
    const meta = await createSession({
      provider: 'claude',
      cwd: '/proj/e',
      externalSessionRef: '0',
      model: 'claude-2.5-pro',
    });
    expect(meta.options).toEqual({});
  });

  // Recorded so continue_conversation can resume on the same model instead of
  // falling back to default_tier and switching models mid-thread.
  it('records the tier the session was started with', async () => {
    const meta = await createSession({
      provider: 'codex',
      cwd: '/proj/f',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5.6-sol',
      tier: 'high',
    });
    expect(meta.tier).toBe('high');
  });

  it('omits tier when the caller supplies none', async () => {
    const meta = await createSession({
      provider: 'codex',
      cwd: '/proj/g',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    expect(meta.tier).toBeUndefined();
  });
});
