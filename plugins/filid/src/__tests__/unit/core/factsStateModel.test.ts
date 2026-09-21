import { describe, expect, it } from 'vitest';

import {
  FACTS_FILE_STATES,
  FACTS_SCHEMA_VERSION,
} from '../../../constants/facts.js';
import {
  classifyFactsFile,
  selectUnknownFiles,
} from '../../../core/facts/index.js';
import type {
  FactsFileState,
  FileFacts,
  StoredFactsRecord,
} from '../../../core/facts/index.js';

const EPOCH = 'sha256:current';

/**
 * Build a stored record for the state table.
 * @param facts Fields to override on the minimal record.
 * @param overrides Fields to override on the stored envelope.
 * @returns A record the classifier can read.
 */
function storedRecord(
  facts: Partial<FileFacts> = {},
  overrides: Partial<StoredFactsRecord> = {},
): StoredFactsRecord {
  return {
    schemaVersion: FACTS_SCHEMA_VERSION,
    resolutionEpoch: EPOCH,
    rejectedClaims: [],
    facts: {
      schemaVersion: FACTS_SCHEMA_VERSION,
      path: 'src/a.ts',
      contentHash: `sha256:${'0'.repeat(64)}`,
      references: [],
      provenance: {
        tool: 't',
        version: '1',
        command: '',
        tier: 'tool',
        resolutionInputs: [],
      },
      ...facts,
    },
    ...overrides,
  };
}

/**
 * Classify one file with everything else held at the healthy default.
 * @param evidence Fields to override on the healthy evidence.
 * @returns The resulting state.
 */
function classify(
  evidence: Partial<Parameters<typeof classifyFactsFile>[0]> = {},
): FactsFileState {
  return classifyFactsFile(
    {
      path: 'src/a.ts',
      inScope: true,
      record: storedRecord(),
      syntaxValid: true,
      resolutionInputsValid: true,
      hasOpenItems: false,
      judgementsUnreadable: false,
      awaitingReDerivation: false,
      hasPendingAttestation: false,
      ...evidence,
    },
    EPOCH,
  );
}

describe('facts file state table', () => {
  it('is exact when the record binds, resolves and reports no doubt', () => {
    expect(classify()).toBe(FACTS_FILE_STATES.EXACT);
  });

  it('is unsupported outside the declared scope, whatever the record says', () => {
    expect(classify({ inScope: false, record: null })).toBe(
      FACTS_FILE_STATES.UNSUPPORTED,
    );
  });

  it('is missing when no record exists', () => {
    expect(classify({ record: null, syntaxValid: false })).toBe(
      FACTS_FILE_STATES.MISSING,
    );
  });

  it('is missing when the record no longer binds to the file bytes', () => {
    expect(classify({ syntaxValid: false })).toBe(FACTS_FILE_STATES.MISSING);
  });

  it('is needs-resolution when the record binds but its epoch has moved', () => {
    expect(
      classify({ record: storedRecord({}, { resolutionEpoch: 'sha256:old' }) }),
    ).toBe(FACTS_FILE_STATES.NEEDS_RESOLUTION);
  });

  it('is needs-resolution when an input the record declared has moved', () => {
    expect(classify({ resolutionInputsValid: false })).toBe(
      FACTS_FILE_STATES.NEEDS_RESOLUTION,
    );
  });

  it('is uncertain while the side table holds an unsettled item', () => {
    expect(classify({ hasOpenItems: true })).toBe(FACTS_FILE_STATES.UNCERTAIN);
  });

  it('is tool-error when the provider reported a failure', () => {
    expect(
      classify({ record: storedRecord({ toolError: { message: 'boom' } }) }),
    ).toBe(FACTS_FILE_STATES.TOOL_ERROR);
  });

  it('is uncertain when any reference carries indeterminate certainty', () => {
    const record = storedRecord({
      references: [
        {
          specifier: './x.js',
          kind: 'static',
          certainty: 'indeterminate',
          resolved: { unresolved: true },
        },
      ],
    });

    expect(classify({ record })).toBe(FACTS_FILE_STATES.UNCERTAIN);
  });

  it('is uncertain when some of the submitted claims were refused', () => {
    expect(
      classify({
        record: storedRecord(
          {},
          { rejectedClaims: [{ code: 'facts-reference-absent' }] },
        ),
      }),
    ).toBe(
      FACTS_FILE_STATES.UNCERTAIN,
    );
  });

  it('reports a stale epoch before a tool error, so re-resolution comes first', () => {
    const record = storedRecord(
      { toolError: { message: 'boom' } },
      { resolutionEpoch: 'sha256:old' },
    );

    expect(classify({ record })).toBe(FACTS_FILE_STATES.NEEDS_RESOLUTION);
  });
});

describe('unknownFiles', () => {
  it('carries each unknown state as its cause code, sorted by path', () => {
    const states = new Map<string, FactsFileState>([
      ['src/z.ts', FACTS_FILE_STATES.MISSING],
      ['src/a.ts', FACTS_FILE_STATES.EXACT],
      ['src/b.ts', FACTS_FILE_STATES.NEEDS_RESOLUTION],
      ['src/c.ts', FACTS_FILE_STATES.UNCERTAIN],
      ['src/d.ts', FACTS_FILE_STATES.TOOL_ERROR],
      ['src/e.ts', FACTS_FILE_STATES.UNSUPPORTED],
    ]);

    expect(selectUnknownFiles(states)).toEqual([
      { path: 'src/b.ts', causes: ['facts-needs-resolution'] },
      { path: 'src/c.ts', causes: ['facts-uncertain'] },
      { path: 'src/d.ts', causes: ['facts-tool-error'] },
      { path: 'src/z.ts', causes: ['facts-missing'] },
    ]);
  });

  it('orders by raw bytes, not locale collation', () => {
    // '-' (0x2D) < 'Z' (0x5A) < 'a' (0x61) in byte order; ICU locale collation
    // would instead place 'a/a.ts' before 'a/Z.ts'.
    const states = new Map<string, FactsFileState>([
      ['a/a.ts', FACTS_FILE_STATES.MISSING],
      ['a/Z.ts', FACTS_FILE_STATES.MISSING],
      ['a/-b.ts', FACTS_FILE_STATES.MISSING],
    ]);

    expect(selectUnknownFiles(states)).toEqual([
      { path: 'a/-b.ts', causes: ['facts-missing'] },
      { path: 'a/Z.ts', causes: ['facts-missing'] },
      { path: 'a/a.ts', causes: ['facts-missing'] },
    ]);
  });

  it('excludes unsupported, because out of scope is a decision, not a gap', () => {
    const states = new Map<string, FactsFileState>([
      ['src/e.ts', FACTS_FILE_STATES.UNSUPPORTED],
    ]);

    expect(selectUnknownFiles(states)).toEqual([]);
  });
});
