import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { buildSettingsState } from '../utils/buildSettingsState.js';

const pluginRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
const userRulesDir = join(process.env.CLAUDE_CONFIG_DIR ?? '', 'rules');

/**
 * The layer the settings page opens on, and the rule channel that layer
 * writes into.
 *
 * One toggle governs both the dial's file and the rule channel, so the state
 * has to name a single layer rather than one per axis.
 */
describe('settings state layer', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
    rmSync(userRulesDir, { recursive: true, force: true });
  });

  function seedRepo(dial: string | null): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-state-scope-'));
    tempDirs.push(repoRoot);
    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });
    if (dial !== null) {
      mkdirSync(join(repoRoot, '.seiri'), { recursive: true });
      writeFileSync(
        join(repoRoot, '.seiri', 'config.json'),
        JSON.stringify({ intervention: dial }),
        'utf8',
      );
    }
    return repoRoot;
  }

  it('opens on the project layer and names its rule channel', () => {
    const repoRoot = seedRepo('advisory');

    const state = buildSettingsState(repoRoot, pluginRoot);

    expect(state.ruleDocs.scope).toBe('project');
    expect(state.ruleDocs.displayTarget).toBe(
      join(repoRoot, '.claude', 'rules'),
    );
  });

  it('opens on the user layer when the project stores no dial', () => {
    const repoRoot = seedRepo(null);

    const state = buildSettingsState(repoRoot, pluginRoot);

    expect(state.configExists).toBe(false);
    expect(state.ruleDocs.scope).toBe('user');
    expect(state.ruleDocs.displayTarget).toBe(userRulesDir);
  });

  it('snapshots rule deployment at the layer it opened on', () => {
    const repoRoot = seedRepo(null);
    mkdirSync(userRulesDir, { recursive: true });

    const state = buildSettingsState(repoRoot, pluginRoot);

    for (const entry of state.ruleDocs.entries)
      expect(entry.target.startsWith(userRulesDir)).toBe(true);
  });
});
