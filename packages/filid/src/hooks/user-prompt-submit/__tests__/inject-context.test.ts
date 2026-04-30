import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createDefaultConfig,
  writeConfig,
} from '../../../core/infra/config-loader/config-loader.js';
import { buildMinimalContext } from '../utils/build-minimal-context.js';

describe('buildMinimalContext', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const RULE_FILE = 'filid_fca-policy.md';
  const LEGACY_FILE = 'fca.md';

  function makeProject(options: {
    deployFca: boolean;
    legacy?: boolean;
  }): string {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-inject-context-'));
    tempDirs.push(projectRoot);
    writeConfig(projectRoot, createDefaultConfig());
    if (options.deployFca) {
      const rulesDir = join(projectRoot, '.claude', 'rules');
      mkdirSync(rulesDir, { recursive: true });
      const filename = options.legacy ? LEGACY_FILE : RULE_FILE;
      writeFileSync(join(rulesDir, filename), '# fca\n', 'utf8');
    }
    return projectRoot;
  }

  it('emits the action-path pointer when rule doc is deployed', () => {
    const projectRoot = makeProject({ deployFca: true });

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain(
      `[filid] FCA-AI active. Rules: .claude/rules/${RULE_FILE}`,
    );
    expect(context).not.toContain('Rules not deployed');
    expect(context).not.toContain('Validation rules: internal built-ins');
    expect(context).not.toContain('Project rule docs');
  });

  it('falls back to legacy fca.md when new filename is absent', () => {
    const projectRoot = makeProject({ deployFca: true, legacy: true });

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain(
      `[filid] FCA-AI active. Rules: .claude/rules/${LEGACY_FILE}`,
    );
    expect(context).not.toContain('Rules not deployed');
  });

  it('warns with a Rules not deployed message when rule doc is missing', () => {
    const projectRoot = makeProject({ deployFca: false });

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain('Rules not deployed');
    expect(context).toContain('/filid:filid-setup');
    expect(context).not.toContain('FCA-AI active');
    expect(context).not.toContain('Project rule docs');
  });

  it('always emits exactly one [filid:lang] tag', () => {
    const deployed = buildMinimalContext(makeProject({ deployFca: true }));
    const missing = buildMinimalContext(makeProject({ deployFca: false }));

    expect(deployed).toContain('[filid:lang]');
    expect(missing).toContain('[filid:lang]');
    expect(deployed.match(/\[filid:lang\]/g) ?? []).toHaveLength(1);
    expect(missing.match(/\[filid:lang\]/g) ?? []).toHaveLength(1);
  });

  it('lists disabled rule IDs when config marks rules as disabled', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-inject-context-'));
    tempDirs.push(projectRoot);
    mkdirSync(join(projectRoot, '.filid'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.filid', 'config.json'),
      JSON.stringify({
        version: '1.0',
        language: 'en',
        rules: {
          'naming-convention': { enabled: false },
          'max-depth': { enabled: true },
          'circular-dependency': { enabled: false },
        },
      }),
    );

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain(
      '[filid] Disabled rules: naming-convention, circular-dependency',
    );
  });

  it('omits the Disabled rules line when no rule is disabled', () => {
    const projectRoot = makeProject({ deployFca: true });

    const context = buildMinimalContext(projectRoot);

    expect(context).not.toContain('Disabled rules');
  });

  it('falls back to en and emits Not initialized when config is missing', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-inject-context-'));
    tempDirs.push(projectRoot);

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain('[filid] ⚠ Not initialized');
    expect(context).toContain('[filid:lang] en');
    expect(context).not.toContain('Disabled rules');
  });
});
