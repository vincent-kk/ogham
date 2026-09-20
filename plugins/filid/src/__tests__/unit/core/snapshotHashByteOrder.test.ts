import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeSnapshotHash } from '../../../core/projectSnapshot/index.js';

/** Two names whose byte order is the reverse of most locales' collation. */
const NAMES = ['B.ts', 'a.ts'] as const;

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-hash-order-'));
  for (const name of NAMES)
    writeFileSync(join(root, name), `export const x = '${name}';\n`);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

/**
 * Frame the given files the way `computeSnapshotHash` does, in the given order.
 * @param order Project-relative names, in the order to fold them.
 * @returns The digest that order produces.
 */
function digestOf(order: readonly string[]): string {
  const hash = createHash('sha256');
  for (const name of order) {
    const bytes = readFileSync(join(root, name));
    hash.update(`file:${name.length}:${name}:`);
    hash.update(`bytes:${bytes.byteLength}:`);
    hash.update(bytes);
  }
  return hash.digest('hex');
}

describe('the snapshot hash folds its files in byte order', () => {
  it('orders B.ts before a.ts, whatever the machine collates', () => {
    // The digest travels between machines — a PR comment, a report, evidence.md
    // carry it — so its ordering may not consult ICU, whose collation differs
    // by Node build and locale. Byte order depends on nothing outside the name.
    const computed = computeSnapshotHash(root, [...NAMES]);

    expect(computed).toBe(digestOf(['B.ts', 'a.ts']));
    expect(computed).not.toBe(digestOf(['a.ts', 'B.ts']));
  });

  it('answers the same whatever order the caller lists them in', () => {
    expect(computeSnapshotHash(root, ['a.ts', 'B.ts'])).toBe(
      computeSnapshotHash(root, ['B.ts', 'a.ts']),
    );
  });
});
