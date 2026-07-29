import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { syncRuleDocs } from '../../../../core/infra/configLoader/loaders/syncRuleDocs.js';
import { buildSettingsState } from '../utils/buildSettingsState.js';

const REQUIRED_FILE = 'filid_fractal-boundaries.md';
const REQUIRED_BODY = '# FCA policy\n';

let projectRoot: string;
let pluginRoot: string;

const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

const userRulesDir = (): string =>
  join(process.env.CLAUDE_CONFIG_DIR ?? '', 'rules');

function writeTemplates(): void {
  const rulesDir = join(pluginRoot, 'templates', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(join(rulesDir, REQUIRED_FILE), REQUIRED_BODY, 'utf8');
  writeFileSync(
    join(rulesDir, 'manifest.json'),
    JSON.stringify({
      version: '1.0',
      rules: [
        {
          id: 'filid_fractal-boundaries',
          filename: REQUIRED_FILE,
          required: true,
          title: 'FCA',
          description: 'required',
          templateHash: sha256(REQUIRED_BODY),
        },
      ],
    }),
    'utf8',
  );
}

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'filid-settings-state-'));
  pluginRoot = mkdtempSync(join(tmpdir(), 'filid-settings-plugin-'));
  writeTemplates();
  // buildSettingsState resolves the plugin root from the host channel rather
  // than taking it as an argument, so the env var is the only way in.
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
});

afterEach(() => {
  delete process.env.CLAUDE_PLUGIN_ROOT;
  rmSync(userRulesDir(), { recursive: true, force: true });
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(pluginRoot, { recursive: true, force: true });
});

describe('settings state rule documents', () => {
  it('carries a snapshot for each layer, not just the one in use', () => {
    const state = buildSettingsState(projectRoot);

    expect(state.ruleDocs.pluginRootResolved).toBe(true);
    expect(state.ruleDocs.layers.user.autoDeployed[0]?.target).toBe(
      join(userRulesDir(), REQUIRED_FILE),
    );
    expect(state.ruleDocs.layers.project.autoDeployed[0]?.target).toBe(
      join(projectRoot, '.claude', 'rules', REQUIRED_FILE),
    );
  });

  it('names each channel absolutely, since a per-row path is relative to a root the page cannot show', () => {
    const state = buildSettingsState(projectRoot);

    expect(state.ruleDocs.layers.user.displayTarget).toBe(userRulesDir());
    expect(state.ruleDocs.layers.project.displayTarget).toBe(
      join(projectRoot, '.claude', 'rules'),
    );
  });

  it('reports one layer deployed and the other not, so the toggle can tell them apart', () => {
    syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'user' });

    const state = buildSettingsState(projectRoot);

    expect(state.ruleDocs.layers.user.autoDeployed[0]?.deployed).toBe(true);
    expect(state.ruleDocs.layers.project.autoDeployed[0]?.deployed).toBe(false);
  });
});
