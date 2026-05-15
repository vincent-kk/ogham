import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createDefaultConfig,
  initProject,
  writeConfig,
} from '../config-loader.js';

describe('writeConfig', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes .filid/config.json at the git root for subdirectory inputs', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'filid-config-loader-'));
    tempDirs.push(repoRoot);

    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });
    const nestedDir = join(repoRoot, 'src', 'payments');
    mkdirSync(nestedDir, { recursive: true });

    const config = createDefaultConfig();
    config.language = 'ko';

    writeConfig(nestedDir, config);

    const rootConfigPath = join(repoRoot, '.filid', 'config.json');
    const nestedConfigPath = join(nestedDir, '.filid', 'config.json');

    expect(() => readFileSync(rootConfigPath, 'utf8')).not.toThrow();
    expect(() => readFileSync(nestedConfigPath, 'utf8')).toThrow();

    const written = JSON.parse(readFileSync(rootConfigPath, 'utf8')) as {
      language?: string;
    };
    expect(written.language).toBe('ko');
  });
});

describe('createDefaultConfig — language seeding', () => {
  it('includes a top-level language key when language is provided', () => {
    const config = createDefaultConfig('Korean');
    expect(config.language).toBe('Korean');
  });

  it('omits the language key when no argument is provided', () => {
    const config = createDefaultConfig();
    expect(config.language).toBeUndefined();
    expect(Object.keys(config)).not.toContain('language');
  });

  it('orders language between version and rules', () => {
    const config = createDefaultConfig('Japanese');
    expect(Object.keys(config)).toEqual(['version', 'language', 'rules']);
  });
});

describe('initProject — language seeding', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes the provided language into the created config', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'filid-config-loader-'));
    tempDirs.push(repoRoot);
    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });

    const result = initProject(repoRoot, 'Korean');
    expect(result.configCreated).toBe(true);

    const written = JSON.parse(
      readFileSync(result.filePath.config, 'utf8'),
    ) as { language?: string };
    expect(written.language).toBe('Korean');
  });
});
