import { describe, expect, it } from 'vitest';

import type {
  ContractGroupsByOwner,
  VerificationFileAnalysis,
} from '../../../types/verification.js';
import { evaluateVerificationPolicy } from '../index.js';

const OWNER = '/project/feature';

function file(
  path: string,
  role: VerificationFileAnalysis['role'],
  exactCount: number,
  contractGroupIds: string[] = [],
): VerificationFileAnalysis {
  return {
    path,
    adapterId: 'test-adapter',
    role,
    count: {
      certainty: 'exact',
      exactCount,
      knownLowerBound: exactCount,
      reasons: [],
    },
    ownerFractalPath: OWNER,
    contractGroupIds,
  };
}

function groups(...ids: string[]): ContractGroupsByOwner {
  return new Map([[OWNER, new Set(ids)]]);
}

describe('verification policy', () => {
  it('allows an exact spec-document with 15 cases', () => {
    const result = evaluateVerificationPolicy([
      file('/project/feature/contract.spec', 'spec-document', 15),
    ]);

    expect(result.violations).toEqual([]);
  });

  it('flags an exact spec-document with 16 cases', () => {
    const result = evaluateVerificationPolicy([
      file('/project/feature/contract.spec', 'spec-document', 16),
    ]);

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleId: 'spec-document-case-cap',
        severity: 'error',
      }),
    );
  });

  it('allows an exact test-record with 32 cases', () => {
    const result = evaluateVerificationPolicy([
      file('/project/feature/regression.test', 'test-record', 32),
    ]);

    expect(result.violations).toEqual([]);
  });

  it('flags an exact test-record with 33 cases', () => {
    const result = evaluateVerificationPolicy([
      file('/project/feature/regression.test', 'test-record', 33),
    ]);

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleId: 'test-record-case-cap',
        severity: 'error',
      }),
    );
  });

  it('does not impose a total cap across test-record files', () => {
    const files = Array.from({ length: 4 }, (_, index) =>
      file(`/project/feature/event-${index}.test`, 'test-record', 32),
    );

    expect(evaluateVerificationPolicy(files).violations).toEqual([]);
  });

  it('keeps indeterminate counts out of PASS', () => {
    const analysis = file('/project/feature/dynamic.spec', 'spec-document', 0);
    analysis.count = {
      certainty: 'indeterminate',
      knownLowerBound: 2,
      reasons: ['dynamic parameter table'],
    };

    const result = evaluateVerificationPolicy([analysis]);

    expect(result.certainty).toBe('indeterminate');
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleId: 'spec-document-case-cap',
        severity: 'warning',
      }),
    );
  });

  it('keeps unsupported counts out of PASS', () => {
    const analysis = file('/project/feature/unknown.test', 'test-record', 0);
    analysis.count = {
      certainty: 'unsupported',
      knownLowerBound: 0,
      reasons: ['unsupported syntax'],
    };

    const result = evaluateVerificationPolicy([analysis]);

    expect(result.certainty).toBe('unsupported');
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleId: 'test-record-case-cap',
        severity: 'warning',
      }),
    );
  });

  it('allows multiple specs linked to distinct real DETAIL groups', () => {
    const result = evaluateVerificationPolicy(
      [
        file('/project/feature/create.spec', 'spec-document', 3, ['AC-create']),
        file('/project/feature/delete.spec', 'spec-document', 4, ['AC-delete']),
      ],
      groups('AC-create', 'AC-delete'),
    );

    expect(result.violations).toEqual([]);
  });

  it('flags overlapping spec contract groups as fragmentation', () => {
    const result = evaluateVerificationPolicy(
      [
        file('/project/feature/part-one.spec', 'spec-document', 8, [
          'AC-shared',
        ]),
        file('/project/feature/part-two.spec', 'spec-document', 8, [
          'AC-shared',
        ]),
      ],
      groups('AC-shared'),
    );

    expect(result.violations).toContainEqual(
      expect.objectContaining({ ruleId: 'spec-fragmentation' }),
    );
  });

  it('flags multiple specs when a file has no contract link', () => {
    const result = evaluateVerificationPolicy(
      [
        file('/project/feature/create.spec', 'spec-document', 3, []),
        file('/project/feature/delete.spec', 'spec-document', 4, ['AC-delete']),
      ],
      groups('AC-delete'),
    );

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleId: 'spec-contract-link',
        path: '/project/feature/create.spec',
      }),
    );
  });

  it('flags links to acceptance groups absent from DETAIL', () => {
    const result = evaluateVerificationPolicy(
      [
        file('/project/feature/create.spec', 'spec-document', 3, ['AC-create']),
        file('/project/feature/delete.spec', 'spec-document', 4, [
          'AC-missing',
        ]),
      ],
      groups('AC-create'),
    );

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleId: 'spec-contract-link',
        path: '/project/feature/delete.spec',
      }),
    );
  });
});
