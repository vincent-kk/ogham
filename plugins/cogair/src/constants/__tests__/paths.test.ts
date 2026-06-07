import { homedir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COGAIR_HOME,
  CONFIG_PATH,
  GEMINI_CWD_DIR,
  RUNTIME_DIR,
  SESSIONS_DIR,
  geminiCwdPath,
  projectMetaPath,
  sessionDir,
  sessionPath,
} from '../paths.js';

describe('paths', () => {
  it('places COGAIR_HOME under ~/.claude/plugins/cogair', () => {
    expect(COGAIR_HOME).toBe(join(homedir(), '.claude', 'plugins', 'cogair'));
  });

  it('nests CONFIG_PATH inside COGAIR_HOME', () => {
    expect(CONFIG_PATH).toBe(join(COGAIR_HOME, 'config.json'));
  });

  it('nests SESSIONS_DIR and RUNTIME_DIR inside COGAIR_HOME', () => {
    expect(SESSIONS_DIR).toBe(join(COGAIR_HOME, 'sessions'));
    expect(RUNTIME_DIR).toBe(join(COGAIR_HOME, 'runtime'));
  });

  it('places GEMINI_CWD_DIR inside RUNTIME_DIR', () => {
    expect(GEMINI_CWD_DIR).toBe(join(RUNTIME_DIR, 'gemini-cwd'));
  });

  it('builds per-project paths from project_hash', () => {
    const hash = 'abc123def456';
    expect(sessionDir(hash)).toBe(join(SESSIONS_DIR, hash));
    expect(projectMetaPath(hash)).toBe(join(SESSIONS_DIR, hash, '_meta.json'));
    expect(sessionPath(hash, 'sid')).toBe(join(SESSIONS_DIR, hash, 'sid.json'));
  });

  it('builds gemini-cwd per session', () => {
    expect(geminiCwdPath('sid')).toBe(join(GEMINI_CWD_DIR, 'sid'));
  });
});
