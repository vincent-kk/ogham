import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findConfigRoot } from '../findConfigRoot.js';

describe('findConfigRoot', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function makeTemp(): string {
    const dir = mkdtempSync(join(tmpdir(), 'filid-find-config-root-'));
    tempDirs.push(dir);
    return dir;
  }

  function writeConfigAt(dir: string): void {
    mkdirSync(join(dir, '.filid'), { recursive: true });
    writeFileSync(
      join(dir, '.filid', 'config.json'),
      JSON.stringify({ language: 'ko' }),
    );
  }

  it('returns the directory itself when it holds .filid/config.json', () => {
    const root = makeTemp();
    writeConfigAt(root);
    expect(findConfigRoot(root)).toBe(root);
  });

  it('returns null when no config exists up to the git root', () => {
    const root = makeTemp();
    mkdirSync(join(root, '.git'), { recursive: true });
    const sub = join(root, 'packages', 'pkg');
    mkdirSync(sub, { recursive: true });
    expect(findConfigRoot(sub)).toBeNull();
  });

  it('walks up from a nested subdirectory to the config root', () => {
    const root = makeTemp();
    writeConfigAt(root);
    const sub = join(root, 'packages', 'pkg', 'src');
    mkdirSync(sub, { recursive: true });
    expect(findConfigRoot(sub)).toBe(root);
  });

  it('stops at the git root and ignores a config above it', () => {
    const outer = makeTemp();
    writeConfigAt(outer); // config ABOVE the repository
    const repo = join(outer, 'repo');
    mkdirSync(join(repo, '.git'), { recursive: true });
    const sub = join(repo, 'sub');
    mkdirSync(sub, { recursive: true });
    expect(findConfigRoot(sub)).toBeNull();
  });

  it('prefers a config at the git root over the .git stop', () => {
    const root = makeTemp();
    mkdirSync(join(root, '.git'), { recursive: true });
    writeConfigAt(root); // config AT the git root
    const sub = join(root, 'a', 'b');
    mkdirSync(sub, { recursive: true });
    expect(findConfigRoot(sub)).toBe(root);
  });
});
