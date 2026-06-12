import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readCurrentBranch } from '../readCurrentBranch.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-branch-'));
  mkdirSync(join(root, '.git'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readCurrentBranch', () => {
  it('reads a symbolic HEAD, including slash-separated branch names', () => {
    writeFileSync(join(root, '.git', 'HEAD'), 'ref: refs/heads/spike/poc-1\n');
    expect(readCurrentBranch(root)).toBe('spike/poc-1');
  });

  it('returns null on detached HEAD (bare sha)', () => {
    writeFileSync(join(root, '.git', 'HEAD'), `${'a'.repeat(40)}\n`);
    expect(readCurrentBranch(root)).toBeNull();
  });

  it('returns null when HEAD is missing or no repo exists', () => {
    expect(readCurrentBranch(root)).toBeNull();
    expect(readCurrentBranch(join(root, 'nope'))).toBeNull();
  });
});
