import { homedir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

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

async function loadPaths(): Promise<typeof import('../paths.js')> {
  vi.resetModules();
  return import('../paths.js');
}

describe('hook shared paths', () => {
  afterEach(() => {
    restoreEnv('CLAUDE_PLUGIN_DATA', ORIGINAL_CLAUDE_PLUGIN_DATA);
    restoreEnv('CLAUDE_PLUGIN_DADA', ORIGINAL_CLAUDE_PLUGIN_DADA);
    restoreEnv('CENNAD_CONFIG_PATH', ORIGINAL_CENNAD_CONFIG_PATH);
  });

  it('defaults CENNAD_HOME to ~/.claude/plugins/cennad', async () => {
    delete process.env.CLAUDE_PLUGIN_DATA;
    delete process.env.CENNAD_CONFIG_PATH;

    const { CENNAD_HOME } = await loadPaths();

    expect(CENNAD_HOME).toBe(join(homedir(), '.claude', 'plugins', 'cennad'));
  });

  it('uses CENNAD_CONFIG_PATH instead of CLAUDE_PLUGIN_DATA', async () => {
    process.env.CLAUDE_PLUGIN_DATA = '/tmp/claude-official-data';
    process.env.CENNAD_CONFIG_PATH = '/tmp/cennad-data';

    const { CENNAD_HOME } = await loadPaths();

    expect(CENNAD_HOME).toBe('/tmp/cennad-data');
  });

  it('trims CENNAD_CONFIG_PATH consistently with core path resolution', async () => {
    process.env.CENNAD_CONFIG_PATH = '  /tmp/cennad-data  ';

    const { CENNAD_HOME } = await loadPaths();

    expect(CENNAD_HOME).toBe('/tmp/cennad-data');
  });

  it('ignores CLAUDE_PLUGIN_DATA when CENNAD_CONFIG_PATH is unset', async () => {
    process.env.CLAUDE_PLUGIN_DATA = '/tmp/claude-official-data';
    process.env.CLAUDE_PLUGIN_DADA = '/tmp/claude-official-dada';
    delete process.env.CENNAD_CONFIG_PATH;

    const { CENNAD_HOME } = await loadPaths();

    expect(CENNAD_HOME).toBe(join(homedir(), '.claude', 'plugins', 'cennad'));
  });
});
