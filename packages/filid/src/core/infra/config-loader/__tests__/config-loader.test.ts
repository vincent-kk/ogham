import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createDefaultConfig,
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
