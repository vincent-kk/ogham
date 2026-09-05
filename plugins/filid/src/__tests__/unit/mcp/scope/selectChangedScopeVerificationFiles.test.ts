import { describe, expect, it } from 'vitest';

import { selectChangedScopeVerificationFiles } from '../../../../mcp/tools/reviewState/scope/selectChangedScopeVerificationFiles.js';

import { createReviewScopeFileFixture } from './helpers/createReviewScopeFileFixture.js';
import { createVerificationFileAnalysisFixture } from './helpers/createVerificationFileAnalysisFixture.js';

/** Absolute fixture root used to compare verification ownership. */
const PROJECT_ROOT = '/project';

describe('selectChangedScopeVerificationFiles', () => {
  it.each([
    [
      'verification path equals the changed path',
      createVerificationFileAnalysisFixture(
        '/project/src/value.test.ts',
        '/project/tests',
      ),
      createReviewScopeFileFixture('src/value.test.ts', 'src'),
      true,
    ],
    [
      'verification owner equals the changed owner',
      createVerificationFileAnalysisFixture(
        '/project/tests/domain.test.ts',
        '/project/src/domain',
      ),
      createReviewScopeFileFixture('README.md', 'src/domain'),
      true,
    ],
    [
      'changed path is inside the verification owner',
      createVerificationFileAnalysisFixture(
        '/project/tests/domain.test.ts',
        '/project/src/domain',
      ),
      createReviewScopeFileFixture('src/domain/value.ts', 'src/feature'),
      true,
    ],
    [
      'verification file and owner are outside changed scope',
      createVerificationFileAnalysisFixture(
        '/project/tests/other.test.ts',
        '/project/src/other',
      ),
      createReviewScopeFileFixture('src/domain/value.ts', 'src/domain'),
      false,
    ],
  ] as const)('%s', (_name, file, changed, retained) => {
    expect(
      selectChangedScopeVerificationFiles([file], [changed], PROJECT_ROOT),
    ).toEqual(retained ? [file] : []);
  });
});
