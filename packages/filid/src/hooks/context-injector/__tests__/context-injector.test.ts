import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultConfig, writeConfig } from '../../../core/infra/config-loader/config-loader.js';
import { buildMinimalContext } from '../context-injector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '../../../..');

describe('buildMinimalContext', () => {
  const tempDirs: string[] = [];
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

  afterEach(() => {
    process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports internal validation rules even when no project rule docs are deployed', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-context-injector-'));
    tempDirs.push(projectRoot);
    process.env.CLAUDE_PLUGIN_ROOT = packageRoot;

    writeConfig(projectRoot, createDefaultConfig());

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain(
      '[filid] FCA-AI active. Validation rules: internal built-ins with project overrides.',
    );
    expect(context).toContain('[filid] Project rule docs: none');
    expect(context).not.toContain('Rules not deployed');
  });

  it('reports whichever project rule docs are currently deployed', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-context-injector-'));
    tempDirs.push(projectRoot);
    process.env.CLAUDE_PLUGIN_ROOT = packageRoot;

    writeConfig(projectRoot, createDefaultConfig());
    const rulesDir = join(projectRoot, '.claude', 'rules');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'rfx.md'), '# local rfx\n', 'utf8');

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain('[filid] Project rule docs: rfx.md');
  });
});
