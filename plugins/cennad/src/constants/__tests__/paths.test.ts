import { homedir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  CENNAD_HOME,
  CONFIG_PATH,
  RUNTIME_DIR,
  SESSIONS_DIR,
  projectMetaPath,
  resolveCennadHome,
  sessionDir,
  sessionPath,
} from '../paths.js';

const ORIGINAL_CLAUDE_PLUGIN_DATA = process.env.CLAUDE_PLUGIN_DATA;
const ORIGINAL_CLAUDE_PLUGIN_DADA = process.env.CLAUDE_PLUGIN_DADA;
const ORIGINAL_CENNAD_CONFIG_PATH = process.env.CENNAD_CONFIG_PATH;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe('paths', () => {
  afterEach(() => {
    restoreEnv('CLAUDE_PLUGIN_DATA', ORIGINAL_CLAUDE_PLUGIN_DATA);
    restoreEnv('CLAUDE_PLUGIN_DADA', ORIGINAL_CLAUDE_PLUGIN_DADA);
    restoreEnv('CENNAD_CONFIG_PATH', ORIGINAL_CENNAD_CONFIG_PATH);
  });

  it('places CENNAD_HOME under ~/.claude/plugins/cennad by default', () => {
    expect(CENNAD_HOME).toBe(join(homedir(), '.claude', 'plugins', 'cennad'));
  });

  it('prefers CENNAD_CONFIG_PATH and ignores CLAUDE_PLUGIN_DATA', () => {
    process.env.CLAUDE_PLUGIN_DATA = '/tmp/claude-official-data';
    process.env.CENNAD_CONFIG_PATH = '/tmp/cennad-data';

    expect(resolveCennadHome()).toBe('/tmp/cennad-data');
  });

  it('ignores CLAUDE_PLUGIN_DATA when resolving the default home', () => {
    process.env.CLAUDE_PLUGIN_DATA = '/tmp/claude-official-data';
    process.env.CLAUDE_PLUGIN_DADA = '/tmp/claude-official-dada';
    delete process.env.CENNAD_CONFIG_PATH;

    expect(resolveCennadHome()).toBe(
      join(homedir(), '.claude', 'plugins', 'cennad'),
    );
  });

  it('ignores blank CENNAD_CONFIG_PATH values', () => {
    process.env.CENNAD_CONFIG_PATH = '  ';

    expect(resolveCennadHome()).toBe(
      join(homedir(), '.claude', 'plugins', 'cennad'),
    );
  });

  it('trims CENNAD_CONFIG_PATH consistently with hook path resolution', () => {
    process.env.CENNAD_CONFIG_PATH = '  /tmp/cennad-data  ';

    expect(resolveCennadHome()).toBe('/tmp/cennad-data');
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
