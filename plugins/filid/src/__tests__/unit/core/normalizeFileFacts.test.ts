import { describe, expect, it } from 'vitest';

import { FACTS_SCHEMA_VERSION } from '../../../constants/facts.js';
import { normalizeFileFacts } from '../../../core/facts/validation/utils/normalizeFileFacts.js';
import type { FactsReference, FileFacts } from '../../../core/facts/index.js';

/**
 * A record for `src/index.ts` carrying the given references, in the order given.
 * @param references References as this call's caller wants them ordered.
 * @returns The record.
 */
function record(references: FactsReference[]): FileFacts {
  return {
    schemaVersion: FACTS_SCHEMA_VERSION,
    path: 'src/index.ts',
    contentHash: `sha256:${'0'.repeat(64)}`,
    references,
    provenance: {
      tool: 'tool-a',
      version: '1.0.0',
      command: '',
      tier: 'tool',
      resolutionInputs: [],
    },
  };
}

describe('normalizeFileFacts', () => {
  it('sorts two references that differ only in sourceText the same way regardless of input order', () => {
    const a: FactsReference = {
      specifier: './thing.js',
      sourceText: "require('./thing.js')",
      kind: 'static',
      resolved: { path: 'src/thing.ts' },
    };
    const b: FactsReference = {
      specifier: './thing.js',
      sourceText: "import('./thing.js')",
      kind: 'static',
      resolved: { path: 'src/thing.ts' },
    };

    const forward = normalizeFileFacts(record([a, b]));
    const backward = normalizeFileFacts(record([b, a]));

    expect(JSON.stringify(forward)).toBe(JSON.stringify(backward));
  });

  it('sorts two references that differ only in line the same way regardless of input order', () => {
    const a: FactsReference = {
      specifier: './thing.js',
      kind: 'static',
      resolved: { path: 'src/thing.ts' },
      line: 3,
    };
    const b: FactsReference = {
      specifier: './thing.js',
      kind: 'static',
      resolved: { path: 'src/thing.ts' },
      line: 9,
    };

    const forward = normalizeFileFacts(record([a, b]));
    const backward = normalizeFileFacts(record([b, a]));

    expect(JSON.stringify(forward)).toBe(JSON.stringify(backward));
  });
});
