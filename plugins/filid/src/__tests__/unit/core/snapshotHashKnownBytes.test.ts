import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { pathForCompare, portableResolve } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeSnapshotHash } from '../../../core/projectSnapshot/index.js';

const FIRST_BYTES = 'export const first = 1;\n';
const SECOND_BYTES = 'export const second = 2;\n';

let root: string;

/** The key `computeSnapshotHash` looks a project-relative path up by. */
function keyOf(relativePath: string): string {
  return pathForCompare(portableResolve(root, relativePath));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-known-bytes-'));
  writeFileSync(join(root, 'first.ts'), FIRST_BYTES);
  writeFileSync(join(root, 'second.ts'), SECOND_BYTES);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('computeSnapshotHash known bytes', () => {
  it('hashes the same as reading those bytes from disk', () => {
    const known = new Map([
      [keyOf('first.ts'), Buffer.from(FIRST_BYTES)],
      [keyOf('second.ts'), Buffer.from(SECOND_BYTES)],
    ]);
    expect(
      computeSnapshotHash(root, ['first.ts', 'second.ts'], [], known),
    ).toBe(computeSnapshotHash(root, ['first.ts', 'second.ts']));
  });

  it('hashes the bytes it was handed rather than re-reading the file', () => {
    // Proves the map is consulted at all; a caller may only hand over bytes it
    // read for this same snapshot.
    const known = new Map([[keyOf('first.ts'), Buffer.from('different\n')]]);
    expect(computeSnapshotHash(root, ['first.ts'], [], known)).not.toBe(
      computeSnapshotHash(root, ['first.ts']),
    );
  });

  it('reads a path the map does not hold', () => {
    const partial = new Map([[keyOf('first.ts'), Buffer.from(FIRST_BYTES)]]);
    expect(
      computeSnapshotHash(root, ['first.ts', 'second.ts'], [], partial),
    ).toBe(computeSnapshotHash(root, ['first.ts', 'second.ts']));
  });

  it('finds the bytes whichever spelling names the file', () => {
    const known = new Map([[keyOf('first.ts'), Buffer.from('different\n')]]);
    expect(
      computeSnapshotHash(root, [join(root, 'first.ts')], [], known),
    ).toBe(computeSnapshotHash(root, ['first.ts'], [], known));
  });
});
