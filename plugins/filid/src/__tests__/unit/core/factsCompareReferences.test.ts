import { describe, expect, it } from 'vitest';

import { compareReferences } from '../../../core/facts/index.js';
import type { ComparableReference } from '../../../core/facts/index.js';

/**
 * One comparable reference.
 * @param reference The reported string.
 * @param resolvedPath In-project target, or null for any other resolution.
 * @param kind Reference kind; static unless a case needs otherwise.
 * @returns The reference to compare.
 */
function reference(
  reference: string,
  resolvedPath: string | null,
  kind: ComparableReference['kind'] = 'static',
): ComparableReference {
  return { reference, resolvedPath, kind };
}

describe('compareReferences', () => {
  it('reports an in-project edge the store does not have', () => {
    const result = compareReferences(
      [reference('./thing.js', 'src/thing.ts')],
      [],
    );

    expect(result.missingInStore).toEqual([
      reference('./thing.js', 'src/thing.ts'),
    ]);
  });

  it('reports an in-project edge only the store has, as information', () => {
    const result = compareReferences(
      [],
      [reference('./thing.js', 'src/thing.ts')],
    );

    expect(result.missingInCandidate).toEqual([
      reference('./thing.js', 'src/thing.ts'),
    ]);
    expect(result.missingInStore).toEqual([]);
  });

  it('reports the same reference resolving to two different files', () => {
    const result = compareReferences(
      [reference('./x.js', 'src/x.ts')],
      [reference('./x.js', 'src/x.d.ts')],
    );

    expect(result.resolutionDiffers).toEqual([reference('./x.js', 'src/x.ts')]);
    expect(result.missingInStore).toEqual([]);
  });

  it('agrees silently when both resolve the same reference the same way', () => {
    const result = compareReferences(
      [reference('./x.js', 'src/x.ts')],
      [reference('./x.js', 'src/x.ts')],
    );

    expect(result).toEqual({
      missingInStore: [],
      missingInCandidate: [],
      resolutionDiffers: [],
      informational: [],
    });
  });

  it('keeps a difference that carries no edge out of the judgeable buckets', () => {
    const result = compareReferences([reference('react', null)], []);

    expect(result.informational).toEqual([reference('react', null)]);
    expect(result.missingInStore).toEqual([]);
  });

  it('treats a kind change as a different reference', () => {
    const result = compareReferences(
      [reference('./x.js', 'src/x.ts', 'dynamic')],
      [reference('./x.js', 'src/x.ts', 'static')],
    );

    expect(result.missingInStore).toHaveLength(1);
    expect(result.missingInCandidate).toHaveLength(1);
    expect(result.resolutionDiffers).toEqual([]);
  });

  it('reports an edge the store holds only as external as information', () => {
    const result = compareReferences(
      [reference('./x.js', 'src/x.ts')],
      [reference('./x.js', null)],
    );

    expect(result.informational).toEqual([reference('./x.js', 'src/x.ts')]);
    expect(result.missingInStore).toEqual([]);
  });
});
