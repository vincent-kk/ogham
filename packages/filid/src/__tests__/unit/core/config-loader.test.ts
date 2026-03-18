import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  createDefaultConfig,
  initProject,
  loadConfig,
  loadRuleOverrides,
  writeConfig,
} from '../../../core/infra/config-loader.js';
import { BUILTIN_RULE_IDS } from '../../../types/rules.js';

describe('config-loader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `filid-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Basic: createDefaultConfig ---

  it('createDefaultConfig returns all 8 built-in rules', () => {
    const config = createDefaultConfig();
    expect(config.version).toBe('1.0');
    const ruleIds = Object.keys(config.rules);
    expect(ruleIds).toHaveLength(8);
    for (const id of Object.values(BUILTIN_RULE_IDS)) {
      expect(config.rules[id]).toBeDefined();
      expect(config.rules[id].enabled).toBe(true);
    }
  });

  it('createDefaultConfig severity matches hardcoded defaults', () => {
    const config = createDefaultConfig();
    expect(config.rules['naming-convention'].severity).toBe('warning');
    expect(config.rules['organ-no-intentmd'].severity).toBe('error');
    expect(config.rules['zero-peer-file'].severity).toBe('warning');
    expect(config.rules['max-depth'].severity).toBe('error');
  });

  // --- Basic: loadConfig / writeConfig ---

  it('loadConfig returns null when .filid/config.json does not exist', () => {
    expect(loadConfig(tmpDir)).toBeNull();
  });

  // --- Complex ---

  it('writeConfig creates .filid directory and config.json', () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    expect(existsSync(join(tmpDir, '.filid', 'config.json'))).toBe(true);
  });

  it('writeConfig + loadConfig round-trips correctly', () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    const loaded = loadConfig(tmpDir);
    expect(loaded).toEqual(config);
  });

  it('loadConfig returns null for invalid JSON', () => {
    const configDir = join(tmpDir, '.filid');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'config.json'), 'not-json', 'utf8');
    expect(loadConfig(tmpDir)).toBeNull();
  });

  it('loadRuleOverrides returns empty object when no config exists', () => {
    const overrides = loadRuleOverrides(tmpDir);
    expect(overrides).toEqual({});
  });

  it('loadRuleOverrides returns rules from config', () => {
    const config = createDefaultConfig();
    config.rules['naming-convention'] = { enabled: false, severity: 'error' };
    writeConfig(tmpDir, config);
    const overrides = loadRuleOverrides(tmpDir);
    expect(overrides['naming-convention']).toEqual({ enabled: false, severity: 'error' });
  });

  it('writeConfig does not overwrite unrelated .filid contents', () => {
    const configDir = join(tmpDir, '.filid');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'other-file.txt'), 'keep me', 'utf8');
    writeConfig(tmpDir, createDefaultConfig());
    expect(existsSync(join(configDir, 'other-file.txt'))).toBe(true);
  });

  it('writeConfig preserves custom rules in config', () => {
    const config = createDefaultConfig();
    config.rules['custom-rule'] = { enabled: true, severity: 'info' };
    writeConfig(tmpDir, config);
    const loaded = loadConfig(tmpDir);
    expect(loaded?.rules['custom-rule']).toEqual({ enabled: true, severity: 'info' });
  });

  // --- initProject ---

  describe('initProject', () => {
    it('creates .filid/config.json when it does not exist', () => {
      const result = initProject(tmpDir, tmpDir);
      expect(result.configCreated).toBe(true);
      expect(existsSync(join(tmpDir, '.filid', 'config.json'))).toBe(true);
    });

    it('does not overwrite existing config.json', () => {
      const custom = createDefaultConfig();
      custom.rules['naming-convention'] = { enabled: false, severity: 'error' };
      writeConfig(tmpDir, custom);
      const result = initProject(tmpDir, tmpDir);
      expect(result.configCreated).toBe(false);
      const loaded = loadConfig(tmpDir);
      expect(loaded?.rules['naming-convention'].enabled).toBe(false);
    });

    it('copies fca.md when template exists in pluginRoot', () => {
      // Create a fake plugin root with template
      const fakePluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(fakePluginRoot, 'templates', 'rules'), { recursive: true });
      writeFileSync(join(fakePluginRoot, 'templates', 'rules', 'fca.md'), '# FCA Rules', 'utf8');

      const result = initProject(tmpDir, fakePluginRoot);
      expect(result.fcaRulesCopied).toBe(true);
      expect(existsSync(join(tmpDir, '.claude', 'rules', 'fca.md'))).toBe(true);
    });

    it('does not overwrite existing .claude/rules/fca.md', () => {
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'rules', 'fca.md'), '# Custom', 'utf8');

      const fakePluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(fakePluginRoot, 'templates', 'rules'), { recursive: true });
      writeFileSync(join(fakePluginRoot, 'templates', 'rules', 'fca.md'), '# FCA Rules', 'utf8');

      const result = initProject(tmpDir, fakePluginRoot);
      expect(result.fcaRulesCopied).toBe(false);
      const content = readFileSync(join(tmpDir, '.claude', 'rules', 'fca.md'), 'utf8');
      expect(content).toBe('# Custom');
    });

    it('reports fcaRulesCopied=false when pluginRoot is not provided and env is unset', () => {
      const origEnv = process.env.CLAUDE_PLUGIN_ROOT;
      delete process.env.CLAUDE_PLUGIN_ROOT;
      try {
        const result = initProject(tmpDir);
        expect(result.fcaRulesCopied).toBe(false);
        expect(result.configCreated).toBe(true);
      } finally {
        if (origEnv) process.env.CLAUDE_PLUGIN_ROOT = origEnv;
      }
    });
  });
});
