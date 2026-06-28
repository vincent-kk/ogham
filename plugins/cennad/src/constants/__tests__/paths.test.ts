import { homedir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CENNAD_HOME,
  CONFIG_PATH,
  RUNTIME_DIR,
  SESSIONS_DIR,
  projectMetaPath,
  sessionDir,
  sessionPath,
} from '../paths.js';

describe('paths', () => {
  it('places CENNAD_HOME under ~/.claude/plugins/cennad', () => {
    expect(CENNAD_HOME).toBe(join(homedir(), '.claude', 'plugins', 'cennad'));
  });

  it('nests CONFIG_PATH inside CENNAD_HOME', () => {
    expect(CONFIG_PATH).toBe(join(CENNAD_HOME, 'config.json'));
  });

  it('nests SESSIONS_DIR and RUNTIME_DIR inside CENNAD_HOME', () => {
    expect(SESSIONS_DIR).toBe(join(CENNAD_HOME, 'sessions'));
    expect(RUNTIME_DIR).toBe(join(CENNAD_HOME, 'runtime'));
  });

  it('builds per-project paths from project_hash', () => {
    const hash = 'abc123def456';
    expect(sessionDir(hash)).toBe(join(SESSIONS_DIR, hash));
    expect(projectMetaPath(hash)).toBe(join(SESSIONS_DIR, hash, '_meta.json'));
    expect(sessionPath(hash, 'sid')).toBe(join(SESSIONS_DIR, hash, 'sid.json'));
  });
});
