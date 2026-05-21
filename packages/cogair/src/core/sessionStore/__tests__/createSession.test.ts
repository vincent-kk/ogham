import { readFile, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COGAIR_HOME,
  projectMetaPath,
  sessionPath,
} from '../../../constants/paths.js';
import { getProjectHash } from '../../projectHash/index.js';
import { createSession } from '../createSession.js';

describe('createSession', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('returns a session with a generated UUID and the expected fields', async () => {
    const meta = await createSession({
      provider: 'gemini',
      cwd: '/proj/a',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
      options: {},
    });
    expect(meta.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(meta.provider).toBe('gemini');
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
      provider: 'gemini',
      cwd: '/proj/c',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
    });
    const stored = JSON.parse(
      await readFile(projectMetaPath(meta.project_hash), 'utf8'),
    );
    expect(stored.cwd).toBe('/proj/c');
    expect(typeof stored.created_at).toBe('string');
  });

  it('keeps the original _meta.json across subsequent sessions in the same project', async () => {
    const first = await createSession({
      provider: 'gemini',
      cwd: '/proj/d',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
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
      provider: 'gemini',
      cwd: '/proj/e',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
    });
    expect(meta.options).toEqual({});
  });
});
