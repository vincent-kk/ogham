import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createDefaultConfig,
  writeConfig,
} from '../../../core/infra/config-loader/config-loader.js';
import { buildMinimalContext } from '../context-injector.js';

describe('buildMinimalContext', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeProject(options: { deployFca: boolean }): string {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-context-injector-'));
    tempDirs.push(projectRoot);
    writeConfig(projectRoot, createDefaultConfig());
    if (options.deployFca) {
      const rulesDir = join(projectRoot, '.claude', 'rules');
      mkdirSync(rulesDir, { recursive: true });
      writeFileSync(join(rulesDir, 'fca.md'), '# fca\n', 'utf8');
    }
    return projectRoot;
  }

  it('emits the action-path pointer when fca.md is deployed', () => {
    const projectRoot = makeProject({ deployFca: true });

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain(
      '[filid] FCA-AI active. Rules: .claude/rules/fca.md',
    );
    expect(context).not.toContain('Rules not deployed');
    expect(context).not.toContain('Validation rules: internal built-ins');
    expect(context).not.toContain('Project rule docs');
  });

  it('warns with a Rules not deployed message when fca.md is missing', () => {
    const projectRoot = makeProject({ deployFca: false });

    const context = buildMinimalContext(projectRoot);

    expect(context).toContain('Rules not deployed');
    expect(context).toContain('/filid:filid-setup');
    expect(context).not.toContain('FCA-AI active');
    expect(context).not.toContain('Project rule docs');
  });

  it('always emits a [filid:lang] tag', () => {
    const deployed = buildMinimalContext(makeProject({ deployFca: true }));
    const missing = buildMinimalContext(makeProject({ deployFca: false }));

    expect(deployed).toContain('[filid:lang]');
    expect(missing).toContain('[filid:lang]');
  });
});
