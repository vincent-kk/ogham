import type { ReviewVerdict } from '../../../../../mcp/tools/reviewState/verdict/reviewVerdictTypes.js';

import { readBaselineSectionIds } from './baseline/readBaselineSectionIds.js';

/**
 * Extract baseline verdict and table ID sets without scanning unrelated sections.
 * @param reportText Preserved schema-7 report with verdict frontmatter and canonical headings.
 * @returns Verdict, Confirmed Findings IDs, and Verification Log IDs.
 * @throws When the verdict or either required section is absent.
 */
export function readBaselineExpectedSets(reportText: string): {
  /** Governance verdict in the report frontmatter. */
  verdict: ReviewVerdict;
  /** IDs in the Confirmed Findings section only. */
  confirmedIds: Set<string>;
  /** IDs in the Verification Log section only. */
  verificationIds: Set<string>;
} {
  const frontmatter =
    reportText.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const verdict = frontmatter.match(
    /^verdict: (APPROVED|REQUEST_CHANGES|INCONCLUSIVE)\r?$/m,
  )?.[1] as ReviewVerdict | undefined;
  if (!verdict) throw new Error('Baseline verdict is missing');
  return {
    verdict,
    confirmedIds: readBaselineSectionIds(reportText, 'Confirmed Findings'),
    verificationIds: readBaselineSectionIds(reportText, 'Verification Log'),
  };
}
