import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { handleRuleDocsSync } from '../rule-docs-sync.js';

describe('handleRuleDocsSync', () => {
  const tempDirs: string[] = [];
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  const pluginRoot = fileURLToPath(new URL('../../../../../', import.meta.url));

  afterEach(() => {
    process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function createTempRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'filid-rule-docs-sync-'));
    tempDirs.push(repoRoot);
    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });
    process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
    return repoRoot;
  }

  it('accepts selections as an object map', () => {
    const repoRoot = createTempRepo();

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { rfx: true },
    });

    expect(output.action).toBe('sync');
    if (output.action !== 'sync') {
      throw new Error('expected sync output');
    }
    expect(output.selections).toEqual({ rfx: true });
    expect(existsSync(join(repoRoot, '.claude', 'rules', 'fca.md'))).toBe(true);
    expect(existsSync(join(repoRoot, '.claude', 'rules', 'rfx.md'))).toBe(true);
  });

  it('recovers selections passed as a JSON string', () => {
    const repoRoot = createTempRepo();

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: '{"fca":true,"rfx":true}',
    });

    expect(output.action).toBe('sync');
    if (output.action !== 'sync') {
      throw new Error('expected sync output');
    }
    expect(output.selections).toEqual({ fca: true, rfx: true });

    const rfxPath = join(repoRoot, '.claude', 'rules', 'rfx.md');
    expect(existsSync(rfxPath)).toBe(true);
    expect(readFileSync(rfxPath, 'utf8')).toContain(
      '# Reuse-First Implementation Rules',
    );
  });

  it('throws a descriptive error for invalid selection strings', () => {
    const repoRoot = createTempRepo();

    expect(() =>
      handleRuleDocsSync({
        action: 'sync',
        path: repoRoot,
        selections: '{bad json}',
      }),
    ).toThrow(
      'selections must be a Record<string, boolean> object; received a string that is not valid JSON',
    );
  });
});
