import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
      selections: { 'filid_reuse-first': true },
    });

    expect(output.action).toBe('sync');
    if (output.action !== 'sync') {
      throw new Error('expected sync output');
    }
    expect(output.selections).toEqual({ 'filid_reuse-first': true });
    expect(existsSync(join(repoRoot, '.claude', 'rules', 'filid_fca-policy.md'))).toBe(true);
    expect(existsSync(join(repoRoot, '.claude', 'rules', 'filid_reuse-first.md'))).toBe(true);
  });

  it('recovers selections passed as a JSON string', () => {
    const repoRoot = createTempRepo();

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: '{"filid_fca-policy":true,"filid_reuse-first":true}',
    });

    expect(output.action).toBe('sync');
    if (output.action !== 'sync') {
      throw new Error('expected sync output');
    }
    expect(output.selections).toEqual({ 'filid_fca-policy': true, 'filid_reuse-first': true });

    const rfxPath = join(repoRoot, '.claude', 'rules', 'filid_reuse-first.md');
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

  it('reports optional drift without resync opt-in', () => {
    const repoRoot = createTempRepo();

    // Deploy the optional rule clean.
    handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { 'filid_reuse-first': true },
    });
    const rfxPath = join(repoRoot, '.claude', 'rules', 'filid_reuse-first.md');
    // Simulate local edits.
    writeFileSync(rfxPath, '# user tampered\n', 'utf8');

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { 'filid_reuse-first': true },
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.result.drift).toContain('filid_reuse-first.md');
    expect(output.result.updated).not.toContain('filid_reuse-first.md');
    expect(readFileSync(rfxPath, 'utf8')).toBe('# user tampered\n');
  });

  it('overwrites optional drift when resync is provided', () => {
    const repoRoot = createTempRepo();

    handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { 'filid_reuse-first': true },
    });
    const rfxPath = join(repoRoot, '.claude', 'rules', 'filid_reuse-first.md');
    writeFileSync(rfxPath, '# user tampered\n', 'utf8');

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { 'filid_reuse-first': true },
      resync: ['filid_reuse-first'],
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.result.updated).toContain('filid_reuse-first.md');
    expect(output.result.drift).not.toContain('filid_reuse-first.md');
    expect(output.resync).toEqual(['filid_reuse-first']);
    expect(readFileSync(rfxPath, 'utf8')).toContain(
      '# Reuse-First Implementation Rules',
    );
  });

  it('records unknown resync ids in result.skipped', () => {
    const repoRoot = createTempRepo();

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
      resync: ['does-not-exist'],
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'does-not-exist', reason: 'unknown rule id' }),
      ]),
    );
    expect(output.resync).toEqual([]);
  });

  it('recovers resync passed as a JSON string array', () => {
    const repoRoot = createTempRepo();

    handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { 'filid_reuse-first': true },
    });
    const rfxPath = join(repoRoot, '.claude', 'rules', 'filid_reuse-first.md');
    writeFileSync(rfxPath, '# user tampered\n', 'utf8');

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { 'filid_reuse-first': true },
      resync: '["filid_reuse-first"]',
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.resync).toEqual(['filid_reuse-first']);
    expect(output.result.updated).toContain('filid_reuse-first.md');
  });

  it('throws a descriptive error for invalid resync strings', () => {
    const repoRoot = createTempRepo();

    expect(() =>
      handleRuleDocsSync({
        action: 'sync',
        path: repoRoot,
        selections: {},
        resync: '[bad json]',
      }),
    ).toThrow(
      'resync must be a string array; received a non-JSON string: "[bad json]"',
    );
  });

  it('auto-updates required rule when deployed content drifts', () => {
    const repoRoot = createTempRepo();

    // Seed the required rule.
    handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
    });
    const fcaPath = join(repoRoot, '.claude', 'rules', 'filid_fca-policy.md');
    writeFileSync(fcaPath, '# stale required\n', 'utf8');

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.result.updated).toContain('filid_fca-policy.md');
    expect(output.result.drift).not.toContain('filid_fca-policy.md');
    expect(readFileSync(fcaPath, 'utf8')).not.toBe('# stale required\n');
  });

  it('status exposes templateHash/deployedHash/inSync for deployed entries', () => {
    const repoRoot = createTempRepo();

    handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { 'filid_reuse-first': true },
    });
    const rfxPath = join(repoRoot, '.claude', 'rules', 'filid_reuse-first.md');
    writeFileSync(rfxPath, '# user tampered\n', 'utf8');

    const output = handleRuleDocsSync({ action: 'status', path: repoRoot });
    if (output.action !== 'status') throw new Error('expected status output');
    const rfx = output.status.entries.find((e) => e.id === 'filid_reuse-first');
    expect(rfx).toBeDefined();
    expect(rfx!.templateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rfx!.deployedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rfx!.inSync).toBe(false);
  });
});
