import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultConfig,
  writeConfig,
} from '../../../core/infra/config-loader/config-loader.js';
import * as ruleEngine from '../../../core/rules/rule-engine/rule-engine.js';
import { buildMinimalContext } from '../context-injector.js';

describe('buildMinimalContext', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const RULE_FILE = 'filid_fca-policy.md';
  const LEGACY_FILE = 'fca.md';

  function makeProject(options: { deployFca: boolean; legacy?: boolean }): string {
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-context-injector-'));
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
    // Regression guard: an earlier version re-emitted the lang tag from a
    // catch block when rule-engine loading failed, producing two
    // [filid:lang] lines that confused downstream lang-tag readers.
    expect(deployed.match(/\[filid:lang\]/g) ?? []).toHaveLength(1);
    expect(missing.match(/\[filid:lang\]/g) ?? []).toHaveLength(1);
  });

  it('still emits exactly one [filid:lang] tag when loadBuiltinRules throws', () => {
    const projectRoot = makeProject({ deployFca: true });
    const spy = vi
      .spyOn(ruleEngine, 'loadBuiltinRules')
      .mockImplementation(() => {
        throw new Error('rule-engine load failure (simulated)');
      });

    try {
      const context = buildMinimalContext(projectRoot);

      expect(context.match(/\[filid:lang\]/g) ?? []).toHaveLength(1);
      expect(context).toContain(`[filid] FCA-AI active. Rules: .claude/rules/${RULE_FILE}`);
      // Disabled-rules line is silently skipped on rule-engine failure.
      expect(context).not.toContain('Disabled rules');
    } finally {
      spy.mockRestore();
    }
  });
});
