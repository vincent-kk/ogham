import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { tmp } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { initProject } from '../../../core/infra/configLoader/index.js';

/** Temporary project holding one v1 config. */
let projectRoot: string;

afterEach(() => rmSync(projectRoot, { recursive: true, force: true }));

/** Write a v1 config and return its path. */
function writeV1Config(config: Record<string, unknown>): string {
  projectRoot = mkdtempSync(join(tmp(), 'filid-config-v1-'));
  mkdirSync(join(projectRoot, '.git'), { recursive: true });
  mkdirSync(join(projectRoot, '.filid'), { recursive: true });
  const path = join(projectRoot, '.filid/config.json');
  writeFileSync(path, JSON.stringify({ version: '1.0', ...config }));
  return path;
}

describe('project_setup init records a lossless v1 config as v2', () => {
  it('writes the converted config when every key has a v2 home', () => {
    const path = writeV1Config({ rules: {} });
    const result = initProject(projectRoot);
    expect(result.configMigrated).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8')).version).toBe('2.0');
  });

  it('keeps the file when an unrecognized top-level key would be discarded', () => {
    const path = writeV1Config({ rules: {}, experimental: { flag: true } });
    const bytes = readFileSync(path, 'utf8');
    expect(initProject(projectRoot).configMigrated).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('keeps the file when the conversion would discard a key', () => {
    const path = writeV1Config({
      rules: { 'naming-convention': { enabled: false } },
    });
    const bytes = readFileSync(path, 'utf8');
    const result = initProject(projectRoot);
    expect(result.configMigrated).toBe(false);
    expect(readFileSync(path, 'utf8')).toBe(bytes);
  });
});
