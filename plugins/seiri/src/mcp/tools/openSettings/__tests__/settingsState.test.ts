import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { loadManifest } from '../../../../core/ruleDocs/loaders/loadManifest.js';
import { applyRuleDocs } from '../../../../core/ruleDocs/sync/applyRuleDocs.js';
import { buildSettingsState } from '../utils/buildSettingsState.js';

const pluginRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
const anchor = loadManifest(pluginRoot).rules[0];
const userRulesDir = join(process.env.CLAUDE_CONFIG_DIR ?? '', 'rules');

/**
 * The layer the settings page opens on, and what it knows about the layer it
 * did not open on.
 *
 * One toggle governs both the dial's file and the rule channel, so the state
 * names a single active layer — and carries both, because flipping the toggle
 * must not leave the page showing the channel it just left.
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

  it('opens on the project layer when the project stores a dial', () => {
    const repoRoot = seedRepo('advisory');

    const state = buildSettingsState(repoRoot, pluginRoot);

    expect(state.ruleDocs.scope).toBe('project');
  });

  it('opens on the user layer when the project stores no dial', () => {
    const repoRoot = seedRepo(null);

    const state = buildSettingsState(repoRoot, pluginRoot);

    expect(state.configExists).toBe(false);
    expect(state.ruleDocs.scope).toBe('user');
  });

  it('names each layer its own channel, not the active one twice', () => {
    const repoRoot = seedRepo('advisory');

    const state = buildSettingsState(repoRoot, pluginRoot);

    expect(state.ruleDocs.layers.project.displayTarget).toBe(
      join(repoRoot, '.claude', 'rules'),
    );
    expect(state.ruleDocs.layers.user.displayTarget).toBe(userRulesDir);
  });

  it('snapshots both layers so the toggle needs no round trip', () => {
    const repoRoot = seedRepo('advisory');
    applyRuleDocs(repoRoot, pluginRoot, [anchor.id], { scope: 'user' });

    const state = buildSettingsState(repoRoot, pluginRoot);
    const deployedAt = (scope: 'user' | 'project'): boolean =>
      state.ruleDocs.layers[scope].entries.find(
        (entry) => entry.id === anchor.id,
      )?.deployed === true;

    // Opened on project, yet the user layer's deployment is already known.
    expect(state.ruleDocs.scope).toBe('project');
    expect(deployedAt('user')).toBe(true);
    expect(deployedAt('project')).toBe(false);
    for (const entry of state.ruleDocs.layers.user.entries)
      expect(entry.target.startsWith(userRulesDir)).toBe(true);
  });
});
