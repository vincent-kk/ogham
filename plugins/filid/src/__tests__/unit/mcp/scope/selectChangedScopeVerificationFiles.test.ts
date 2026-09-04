import { describe, expect, it } from 'vitest';

import { selectChangedScopeVerificationFiles } from '../../../../mcp/tools/reviewState/scope/selectChangedScopeVerificationFiles.js';
import type { ReviewScopeFile } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import type { VerificationFileAnalysis } from '../../../../types/verification.js';

const PROJECT_ROOT = '/project';

function changedFile(path: string, owner: string | null): ReviewScopeFile {
  return {
    path,
    change: 'M',
    role: 'source',
    owner,
    insertions: 1,
    deletions: 1,
  };
}

function verificationFile(
  path: string,
  ownerFractalPath: string,
): VerificationFileAnalysis {
  return {
    path,
    adapterId: 'fixture-adapter',
    role: 'test-record',
    count: {
      certainty: 'exact',
      exactCount: 1,
      knownLowerBound: 1,
      reasons: [],
    },
    ownerFractalPath,
    contractGroupIds: [],
  };
}

describe('selectChangedScopeVerificationFiles', () => {
  it.each([
    [
      'verification path equals the changed path',
      verificationFile('/project/src/value.test.ts', '/project/tests'),
      changedFile('src/value.test.ts', 'src'),
      true,
    ],
    [
      'verification owner equals the changed owner',
      verificationFile('/project/tests/domain.test.ts', '/project/src/domain'),
      changedFile('README.md', 'src/domain'),
      true,
    ],
    [
      'changed path is inside the verification owner',
      verificationFile('/project/tests/domain.test.ts', '/project/src/domain'),
      changedFile('src/domain/value.ts', 'src/feature'),
      true,
    ],
    [
      'verification file and owner are outside changed scope',
      verificationFile('/project/tests/other.test.ts', '/project/src/other'),
      changedFile('src/domain/value.ts', 'src/domain'),
      false,
    ],
  ] as const)('%s', (_name, file, changed, retained) => {
    expect(
      selectChangedScopeVerificationFiles([file], [changed], PROJECT_ROOT),
    ).toEqual(retained ? [file] : []);
  });
});
