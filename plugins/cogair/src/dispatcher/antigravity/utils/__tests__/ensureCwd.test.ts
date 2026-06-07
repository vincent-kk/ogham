import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ANTIGRAVITY_CWD_DIR,
  COGAIR_HOME,
  antigravityCwdPath,
} from '../../../../constants/paths.js';
import { ensureCwd } from '../ensureCwd.js';

beforeEach(async () => {
  await rm(COGAIR_HOME, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(COGAIR_HOME, { recursive: true, force: true });
});

describe('ensureCwd', () => {
  it('returns the deterministic antigravityCwdPath for the given sessionId', async () => {
    const sessionId = 'session-abc';
    const result = await ensureCwd(sessionId);
    expect(result).toBe(antigravityCwdPath(sessionId));
  });

  it('creates the directory on disk', async () => {
    const sessionId = 'session-disk';
    const result = await ensureCwd(sessionId);
    const info = await stat(result);
    expect(info.isDirectory()).toBe(true);
  });

  it('is idempotent — second call does not throw and returns the same path', async () => {
    const sessionId = 'session-idempotent';
    const first = await ensureCwd(sessionId);
    const second = await ensureCwd(sessionId);
    expect(second).toBe(first);
  });

  it('creates distinct dirs for distinct sessionIds', async () => {
    const [p1, p2] = await Promise.all([
      ensureCwd('session-one'),
      ensureCwd('session-two'),
    ]);
    expect(p1).not.toBe(p2);
    expect(p1).toBe(join(ANTIGRAVITY_CWD_DIR, 'session-one'));
    expect(p2).toBe(join(ANTIGRAVITY_CWD_DIR, 'session-two'));
    const [s1, s2] = await Promise.all([stat(p1), stat(p2)]);
    expect(s1.isDirectory()).toBe(true);
    expect(s2.isDirectory()).toBe(true);
  });
});
