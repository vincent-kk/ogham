import { access, mkdir, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COGAIR_HOME,
  geminiCwdPath,
  projectMetaPath,
  sessionDir,
  sessionPath,
} from '../../../constants/paths.js';
import { createSession } from '../createSession.js';
import { pruneExpired } from '../pruneExpired.js';
import { updateSession } from '../updateSession.js';

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

describe('pruneExpired', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('returns 0 when the sessions directory does not exist', async () => {
    expect(await pruneExpired(72)).toBe(0);
  });

  it('removes expired session JSON and reports the count', async () => {
    const session = await createSession({
      provider: 'codex',
      cwd: '/proj/old',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    await updateSession({ ...session, last_used_at: hoursAgo(100) });

    const count = await pruneExpired(72);
    expect(count).toBe(1);
    expect(
      await pathExists(sessionPath(session.project_hash, session.session_id)),
    ).toBe(false);
  });

  it('keeps recently used sessions', async () => {
    const session = await createSession({
      provider: 'gemini',
      cwd: '/proj/fresh',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
    });
    const count = await pruneExpired(72);
    expect(count).toBe(0);
    expect(
      await pathExists(sessionPath(session.project_hash, session.session_id)),
    ).toBe(true);
  });

  it('removes the gemini-cwd directory for expired gemini sessions', async () => {
    const session = await createSession({
      provider: 'gemini',
      cwd: '/proj/oldgem',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
    });
    const cwdDir = geminiCwdPath(session.session_id);
    await mkdir(cwdDir, { recursive: true });
    await updateSession({ ...session, last_used_at: hoursAgo(100) });

    await pruneExpired(72);
    expect(await pathExists(cwdDir)).toBe(false);
  });

  it('removes the project dir once every session inside it has expired', async () => {
    const session = await createSession({
      provider: 'codex',
      cwd: '/proj/lone',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    await updateSession({ ...session, last_used_at: hoursAgo(100) });

    await pruneExpired(72);
    expect(await pathExists(sessionDir(session.project_hash))).toBe(false);
    expect(await pathExists(projectMetaPath(session.project_hash))).toBe(false);
  });

  it('preserves the project dir when at least one session is still live', async () => {
    const live = await createSession({
      provider: 'gemini',
      cwd: '/proj/mix',
      externalSessionRef: '0',
      model: 'gemini-2.5-pro',
    });
    const expired = await createSession({
      provider: 'codex',
      cwd: '/proj/mix',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    await updateSession({ ...expired, last_used_at: hoursAgo(100) });

    const count = await pruneExpired(72);
    expect(count).toBe(1);
    expect(
      await pathExists(sessionPath(live.project_hash, live.session_id)),
    ).toBe(true);
    expect(
      await pathExists(sessionPath(expired.project_hash, expired.session_id)),
    ).toBe(false);
    expect(await pathExists(projectMetaPath(live.project_hash))).toBe(true);
  });

  it('does not remove gemini-cwd for codex sessions', async () => {
    const session = await createSession({
      provider: 'codex',
      cwd: '/proj/codex',
      externalSessionRef: 'thread-uuid',
      model: 'gpt-5',
    });
    const fakeGeminiDir = geminiCwdPath(session.session_id);
    await mkdir(fakeGeminiDir, { recursive: true });
    await updateSession({ ...session, last_used_at: hoursAgo(100) });

    await pruneExpired(72);
    expect(await pathExists(fakeGeminiDir)).toBe(true);
  });
});
