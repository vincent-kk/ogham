import type { VerificationFileAnalysis } from '../../../../../types/verification.js';

/**
 * Build one classified verification-file fixture for scope-selection tests.
 *
 * @param path Absolute verification-file path.
 * @param ownerFractalPath Absolute owning fractal path.
 * @returns Complete exact-count verification analysis fixture.
 */
export function createVerificationFileAnalysisFixture(
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
