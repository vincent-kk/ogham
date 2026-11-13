// filid:contract AC-facts-declarations
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveSpecifier } from '../resolveSpecifier.js';

/** Temporary projects owned by these declaration-resolution cases. */
const roots: string[] = [];

/** @param files Relative fixture paths. @returns A project containing those files. */
function project(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-declarations-'));
  roots.push(root);
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), '');
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('declaration resolution: regressions', () => {
  it('resolves ./a from index.d.ts to a.d.ts', () => {
    const root = project(['index.d.ts', 'a.d.ts']);
    expect(resolveSpecifier(join(root, 'index.d.ts'), './a')).toBe(
      join(root, 'a.d.ts'),
    );
  });
  it('resolves ./a to a.d.mts', () => {
    const root = project(['index.d.mts', 'a.d.mts']);
    expect(resolveSpecifier(join(root, 'index.d.mts'), './a')).toBe(
      join(root, 'a.d.mts'),
    );
  });
  it('resolves ./a to a.d.cts', () => {
    const root = project(['index.d.cts', 'a.d.cts']);
    expect(resolveSpecifier(join(root, 'index.d.cts'), './a')).toBe(
      join(root, 'a.d.cts'),
    );
  });
  it('resolves ./b to b/index.d.ts', () => {
    const root = project(['index.d.ts', 'b/index.d.ts']);
    expect(resolveSpecifier(join(root, 'index.d.ts'), './b')).toBe(
      join(root, 'b/index.d.ts'),
    );
  });
  it('applies declaration fallback after an explicit alias substitution', () => {
    const root = project(['index.d.ts', 'types/a.d.ts']);
    expect(
      resolveSpecifier(
        join(root, 'index.d.ts'),
        '@types/a',
        [{ from: '@types/*', to: 'types/*' }],
        root,
      ),
    ).toBe(join(root, 'types/a.d.ts'));
  });
});

describe('declaration resolution: controls', () => {
  it('prefers a.ts over a.d.ts', () => {
    const root = project(['a.ts', 'a.d.ts']);
    expect(resolveSpecifier(join(root, 'index.d.ts'), './a')).toBe(
      join(root, 'a.ts'),
    );
  });
  it('prefers c/index.ts over c.d.ts', () => {
    const root = project(['c/index.ts', 'c.d.ts']);
    expect(resolveSpecifier(join(root, 'index.d.ts'), './c')).toBe(
      join(root, 'c/index.ts'),
    );
  });
  it('keeps explicitly spelled declaration references literal-first', () => {
    const root = project(['a.d.ts', 'a.ts']);
    expect(resolveSpecifier(join(root, 'index.d.ts'), './a.d.ts')).toBe(
      join(root, 'a.d.ts'),
    );
  });
  it('leaves a reference unresolved when no candidate exists', () => {
    const root = project([]);
    expect(resolveSpecifier(join(root, 'index.d.ts'), './absent')).toBeNull();
  });
});
