import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import type {
  ReviewSealSummary,
  ReviewVerdict,
} from '../../verdict/reviewVerdictTypes.js';

/**
 * Restore final counts from the immutable canonical report without reading opinions.
 *
 * @param reportPath Absolute canonical sealed report path.
 * @param verdict Verdict persisted by the sealed state.
 * @returns Persisted response summary, or null when the report is absent or malformed.
 */
export function readSealedReviewSummary(
  reportPath: string,
  verdict: ReviewVerdict,
): ReviewSealSummary | null {
  const report = readUtf8FileIfExistsSync(reportPath);
  const frontmatter = report?.match(/^---\n([\s\S]*?)\n---\n/u)?.[1];
  if (!report || !frontmatter) return null;

  const readCount = (field: string): number | null => {
    const match = frontmatter.match(new RegExp(`^${field}: (\\d+)$`, 'mu'));
    return match ? Number.parseInt(match[1]!, 10) : null;
  };
  const filesTotal = readCount('files_total');
  const filesReviewed = readCount('files_reviewed');
  const filesSkipped = readCount('files_skipped');
  if (
    frontmatter.match(/^verdict: (.+)$/mu)?.[1] !== verdict ||
    filesTotal === null ||
    filesReviewed === null ||
    filesSkipped === null
  )
    return null;

  const verificationLog = report.match(
    /\n## Verification Log\n\n([\s\S]*?)\n\n## Confirmed Findings\n/u,
  )?.[1];
  if (verificationLog === undefined) return null;
  const decisions = Array.from(
    verificationLog.matchAll(
      /^\| [^|]+ \| [^|]+ \| (CONFIRMED|REFUTED|INDETERMINATE) \|/gmu,
    ),
    (match) => match[1],
  );
  return {
    verdict,
    filesTotal,
    filesReviewed,
    filesSkipped,
    confirmed: decisions.filter((decision) => decision === 'CONFIRMED').length,
    refuted: decisions.filter((decision) => decision === 'REFUTED').length,
    indeterminate: decisions.filter((decision) => decision === 'INDETERMINATE')
      .length,
  };
}
