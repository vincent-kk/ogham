import { describe, expect, it } from 'vitest';

import { FACTS_FILE_STATES } from '../../../constants/facts.js';
import type { ProjectFacts } from '../../../core/facts/index.js';
import { factsVerificationClaims } from '../../../core/projectSnapshot/evidence/factsVerificationClaims.js';
import { analyzeVerification } from '../../../core/verification/index.js';
import type { VerificationAdapter } from '../../../types/adapters.js';
import type { VerificationFileFacts } from '../../../types/verification.js';

/** Absolute root the fixture paths sit under. */
const ROOT = '/project';

/**
 * A verification adapter that discovers one file and reads nothing.
 *
 * Every content-reading member throws: the analyzer is supposed to take role,
 * case count and contract links from the record, so a call here is the defect
 * the test exists to catch.
 */
const ADAPTER: VerificationAdapter = {
  id: 'test-adapter',
  detect: () => Promise.resolve({ confidence: 1 }),
  discover: () => Promise.resolve([`${ROOT}/feature/create.spec.ts`]),
  classify: () => {
    throw new Error('the analyzer read the source through classify');
  },
  count: () => {
    throw new Error('the analyzer read the source through count');
  },
  extractContractGroupIds: () => {
    throw new Error('the analyzer read the source through the adapter');
  },
} as unknown as VerificationAdapter;

/**
 * Run the analyzer over one discovered file with the record it has.
 * @param facts What the store says about that file, or nothing.
 * @returns Every analyzed file.
 */
async function analyzeWith(facts?: VerificationFileFacts) {
  return await analyzeVerification({
    projectRoot: ROOT,
    adapters: [ADAPTER],
    ownerFractalPath: () => `${ROOT}/feature`,
    verificationFacts:
      facts === undefined
        ? new Map()
        : new Map([[`${ROOT}/feature/create.spec.ts`.toLowerCase(), facts]]),
  });
}

/**
 * Run the analyzer over one discovered file with the record it has.
 * @param facts What the store says about that file.
 * @returns The single analyzed file.
 */
async function analyzeOne(facts: VerificationFileFacts) {
  const analysis = await analyzeVerification({
    projectRoot: ROOT,
    adapters: [ADAPTER],
    ownerFractalPath: () => `${ROOT}/feature`,
    verificationFacts: new Map([
      [`${ROOT}/feature/create.spec.ts`.toLowerCase(), facts],
    ]),
  });
  return analysis.files[0];
}

const CASES = {
  certainty: 'exact' as const,
  exactCount: 2,
  knownLowerBound: 2,
  reasons: [],
};

describe('the analyzer takes contract links from the record', () => {
  it('carries the ids the record reports', async () => {
    const file = await analyzeOne({
      role: 'spec-document',
      cases: CASES,
      contractGroupIds: ['AC-create'],
    });

    expect(file?.contractGroupIds).toEqual(['AC-create']);
  });

  it('leaves them unreported when the record does not carry them', async () => {
    const file = await analyzeOne({ role: 'spec-document', cases: CASES });

    expect(file?.contractGroupIds).toBeUndefined();
  });
});

describe('a name alone buys no exemption', () => {
  it('leaves a candidate whose record reports no role out of the analysis', async () => {
    // Discovery proposes by name, so a production file renamed to *.spec.ts is
    // discovered. What keeps it from the verification set — and so from the
    // boundary and DAG exemption that set carries — is the record's role.
    const analysis = await analyzeWith({ role: 'unsupported', cases: CASES });

    expect(analysis.files).toEqual([]);
  });

  it('leaves a candidate the store cannot answer for out of the analysis', async () => {
    const analysis = await analyzeWith();

    expect(analysis.files).toEqual([]);
  });

  it('reports the file the store holds no record for, with what to do', async () => {
    const facts = {
      records: new Map(),
      adjudications: new Map(),
    } as unknown as ProjectFacts;

    const claims = factsVerificationClaims(
      ROOT,
      [`${ROOT}/feature/create.spec.ts`],
      facts,
      new Map([['feature/create.spec.ts', FACTS_FILE_STATES.MISSING]]),
    );

    expect(claims.verificationFacts.size).toBe(0);
    expect(claims.diagnostics[0]).toMatchObject({
      code: 'verification-facts-unavailable',
      path: `${ROOT}/feature/create.spec.ts`,
    });
    expect(claims.diagnostics[0]?.nextAction).not.toBe('');
  });
});
