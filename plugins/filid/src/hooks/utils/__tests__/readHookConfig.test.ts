import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readHookConfig } from '../readHookConfig.js';

describe('readHookConfig', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = join(
      tmpdir(),
      `filid-read-hook-config-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(join(cwd, '.filid'), { recursive: true });
    // Bound findConfigRoot's walk-up at cwd so it never escapes the OS tmp
    // dir into an unrelated ancestor config.
    mkdirSync(join(cwd, '.git'), { recursive: true });
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('parses a valid config file', () => {
    writeFileSync(
      join(cwd, '.filid', 'config.json'),
      JSON.stringify({
        language: 'ko',
        rules: { 'naming-convention': { enabled: false } },
      }),
    );
    expect(readHookConfig(cwd)).toEqual({
      language: 'ko',
      rules: { 'naming-convention': { enabled: false } },
    });
  });

  it('returns null when the config file is missing', () => {
    expect(readHookConfig(cwd)).toBeNull();
  });

  it('returns null when the JSON is malformed', () => {
    writeFileSync(join(cwd, '.filid', 'config.json'), '{not valid json');
    expect(readHookConfig(cwd)).toBeNull();
  });

  it('walks up from a subdirectory to read the root config', () => {
    writeFileSync(
      join(cwd, '.filid', 'config.json'),
      JSON.stringify({ language: 'ko' }),
    );
    const sub = join(cwd, 'packages', 'pkg');
    mkdirSync(sub, { recursive: true });
    expect(readHookConfig(sub)).toEqual({ language: 'ko' });
  });
});
