import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readHeadSha } from '../readHeadSha.js';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-headsha-'));
  mkdirSync(join(root, '.git'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readHeadSha', () => {
  it('resolves through a loose ref file', () => {
    writeFileSync(join(root, '.git', 'HEAD'), 'ref: refs/heads/spike/x\n');
    mkdirSync(join(root, '.git', 'refs', 'heads', 'spike'), {
      recursive: true,
    });
    writeFileSync(join(root, '.git', 'refs', 'heads', 'spike', 'x'), `${SHA_A}\n`);
    expect(readHeadSha(root)).toBe(SHA_A);
  });

  it('falls back to packed-refs when the loose ref is absent', () => {
    writeFileSync(join(root, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(
      join(root, '.git', 'packed-refs'),
      `# pack-refs with: peeled fully-peeled sorted\n${SHA_B} refs/heads/main\n^${SHA_A}\n`,
    );
    expect(readHeadSha(root)).toBe(SHA_B);
  });

  it('returns the bare sha on detached HEAD', () => {
    writeFileSync(join(root, '.git', 'HEAD'), `${SHA_A}\n`);
    expect(readHeadSha(root)).toBe(SHA_A);
  });

  it('returns null when the ref cannot be resolved anywhere', () => {
    writeFileSync(join(root, '.git', 'HEAD'), 'ref: refs/heads/ghost\n');
    expect(readHeadSha(root)).toBeNull();
  });
});
