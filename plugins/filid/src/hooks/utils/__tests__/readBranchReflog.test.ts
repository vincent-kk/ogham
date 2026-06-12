import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readBranchReflog } from '../readBranchReflog.js';

const SHA_0 = '0'.repeat(40);
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-reflog-'));
  mkdirSync(join(root, '.git'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readBranchReflog', () => {
  it('parses creation timestamp from the first entry and counts updates', () => {
    mkdirSync(join(root, '.git', 'logs', 'refs', 'heads', 'spike'), {
      recursive: true,
    });
    writeFileSync(
      join(root, '.git', 'logs', 'refs', 'heads', 'spike', 'x'),
      `${SHA_0} ${SHA_A} Dev <dev@x.io> 1760000000 +0900\tbranch: Created from HEAD\n` +
        `${SHA_A} ${SHA_B} Dev <dev@x.io> 1760000500 +0900\tcommit: probe\n`,
    );
    expect(readBranchReflog(root, 'spike/x')).toEqual({
      createdAtMs: 1760000000000,
      updateCount: 2,
    });
  });

  it('returns null when the reflog file is absent', () => {
    expect(readBranchReflog(root, 'spike/x')).toBeNull();
  });

  it('keeps the update count with a null timestamp on a malformed header', () => {
    mkdirSync(join(root, '.git', 'logs', 'refs', 'heads'), { recursive: true });
    writeFileSync(
      join(root, '.git', 'logs', 'refs', 'heads', 'main'),
      'garbage-line-without-timestamp\tmsg\n',
    );
    expect(readBranchReflog(root, 'main')).toEqual({
      createdAtMs: null,
      updateCount: 1,
    });
  });
});
