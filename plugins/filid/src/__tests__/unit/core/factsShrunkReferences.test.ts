import { describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_SCHEMA_VERSION,
} from '../../../constants/facts.js';
import { detectShrunkReferences } from '../../../core/facts/index.js';
import type { FileFacts } from '../../../core/facts/index.js';

/**
 * A record for `src/index.ts` with the given references and provenance.
 * @param targets In-project paths each `./thing.js` style reference resolves to.
 * @param tool Provenance tool name.
 * @param version Provenance tool version.
 * @returns The record.
 */
function record(
  targets: Record<string, string | null>,
  tool = 'tool-a',
  version = '1.0.0',
): FileFacts {
  return {
    schemaVersion: FACTS_SCHEMA_VERSION,
    path: 'src/index.ts',
    contentHash: `sha256:${'0'.repeat(64)}`,
    references: Object.entries(targets).map(([specifier, target]) => ({
      specifier,
      kind: 'static' as const,
      resolved: target === null ? { unresolved: true as const } : { path: target },
    })),
    provenance: {
      tool,
      version,
      command: '',
      tier: 'tool' as const,
      resolutionInputs: [],
    },
  };
}

const { COVERAGE_SHRANK, RESOLUTION_CHANGED } = FACTS_ADJUDICATION_ORIGINS;

describe('detectShrunkReferences', () => {
  it('reports an in-project edge the replacement dropped', () => {
    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted: record({}),
      sameEpoch: true,
    });

    expect(result).toEqual([
      {
        reference: './a.js',
        kind: 'static',
        resolvedPath: 'src/a.ts',
        origin: COVERAGE_SHRANK,
      },
    ]);
  });

  it('reports an edge the replacement re-pointed', () => {
    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted: record({ './a.js': 'src/a.d.ts' }),
      sameEpoch: true,
    });

    expect(result[0]).toMatchObject({ origin: RESOLUTION_CHANGED });
  });

  it('reports an edge downgraded to no resolution at all', () => {
    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted: record({ './a.js': null }),
      sameEpoch: true,
    });

    expect(result[0]).toMatchObject({ origin: RESOLUTION_CHANGED });
  });

  it('stays silent when the replacement carries the same edge', () => {
    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted: record({ './a.js': 'src/a.ts' }),
      sameEpoch: true,
    });

    expect(result).toEqual([]);
  });

  it('exempts the same tool re-resolving at a new epoch', () => {
    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted: record({ './a.js': 'src/a/index.ts' }),
      sameEpoch: false,
    });

    expect(result).toEqual([]);
  });

  it('still reports a different tool at a new epoch', () => {
    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted: record({}, 'tool-b'),
      sameEpoch: false,
    });

    expect(result[0]).toMatchObject({ origin: COVERAGE_SHRANK });
  });

  it('still reports the same tool at a new version', () => {
    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted: record({}, 'tool-a', '2.0.0'),
      sameEpoch: false,
    });

    expect(result[0]).toMatchObject({ origin: COVERAGE_SHRANK });
  });

  it('makes no item from a tool-error replacement', () => {
    const accepted = { ...record({}), toolError: { message: 'parse failed' } };

    const result = detectShrunkReferences({
      previous: record({ './a.js': 'src/a.ts' }),
      accepted,
      sameEpoch: true,
    });

    expect(result).toEqual([]);
  });

  it('makes no item when there was no previous record', () => {
    const result = detectShrunkReferences({
      previous: null,
      accepted: record({}),
      sameEpoch: true,
    });

    expect(result).toEqual([]);
  });

  it('ignores an edge that never resolved in-project to begin with', () => {
    const result = detectShrunkReferences({
      previous: record({ react: null }),
      accepted: record({}),
      sameEpoch: true,
    });

    expect(result).toEqual([]);
  });
});
