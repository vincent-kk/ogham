import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findEntryPoints } from '../../../adapters/ecmascript/structure/findEntryPoints.js';
import { runWithRequestMemo } from '../../../lib/runWithRequestMemo.js';

/**
 * Whether no relative spelling of the fixture directory exists.
 *
 * One exists only where the temporary directory shares a volume with the
 * working directory. A Windows runner puts the temporary directory on `C:` and
 * the checkout on `D:`, and `relative` then answers with an absolute path —
 * the fixture's own spelling, which is the one thing this case needs it not to
 * be.
 */
const relativeSpellingUnavailable = isAbsolute(
  relative(process.cwd(), tmpdir()),
);

/** A directory holding one peer file and, until a test adds one, no entry point. */
let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'filid-entry-memo-'));
  writeFileSync(join(directory, 'peer.ts'), 'export const peer = 1;\n');
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('findEntryPoints inside a request-memo scope', () => {
  it('answers a repeat call without reading the directory again', () => {
    const readings = runWithRequestMemo(() => {
      const first = findEntryPoints(directory);
      writeFileSync(join(directory, 'index.ts'), 'export const a = 1;\n');
      return { first, second: findEntryPoints(directory) };
    });
    expect(readings.first).toEqual([]);
    expect(readings.second).toEqual([]);
  });

  it('reads the directory again once the scope has closed', () => {
    runWithRequestMemo(() => findEntryPoints(directory));
    writeFileSync(join(directory, 'index.ts'), 'export const a = 1;\n');
    expect(findEntryPoints(directory)).toHaveLength(1);
  });

  it('hands each caller descriptors it may mutate', () => {
    writeFileSync(join(directory, 'index.ts'), 'export const a = 1;\n');
    runWithRequestMemo(() => {
      const first = findEntryPoints(directory);
      const second = findEntryPoints(directory);
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      expect(second[0]).not.toBe(first[0]);
      first.length = 0;
      expect(findEntryPoints(directory)).toHaveLength(1);
    });
  });

  it.skipIf(relativeSpellingUnavailable)(
    'gives each spelling of one directory descriptors in that spelling',
    () => {
      writeFileSync(join(directory, 'index.ts'), 'export const a = 1;\n');
      // `join` normalizes away a trailing slash, `.` and `..`, so the only
      // spelling of one directory that survives into a descriptor path is a
      // relative one.
      const relativeSpelling = relative(process.cwd(), directory);
      expect(join(relativeSpelling, 'index.ts')).not.toBe(
        join(directory, 'index.ts'),
      );
      runWithRequestMemo(() => {
        expect(findEntryPoints(directory).map(({ path }) => path)).toContain(
          join(directory, 'index.ts'),
        );
        expect(
          findEntryPoints(relativeSpelling).map(({ path }) => path),
        ).toContain(join(relativeSpelling, 'index.ts'));
      });
    },
  );

  it('keeps the readings of one directory apart by overrides', () => {
    runWithRequestMemo(() => {
      expect(findEntryPoints(directory)).toEqual([]);
      expect(findEntryPoints(directory, ['peer.ts'])).toHaveLength(1);
      expect(findEntryPoints(directory)).toEqual([]);
    });
  });
});
