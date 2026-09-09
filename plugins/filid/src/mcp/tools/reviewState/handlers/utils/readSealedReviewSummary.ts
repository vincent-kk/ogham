import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import type {
  ReviewSealSummary,
  ReviewVerdict,
} from '../../verdict/reviewVerdictTypes.js';

import { parseSealedReviewFrontmatter } from './parseSealedReviewFrontmatter.js';

/** Unsigned integer scalar used by sealed file counts. */
const COUNT_PATTERN = /^\d+$/u;

/** Verification table bounded by the canonical report section headings. */
const VERIFICATION_LOG_PATTERN =
  /\r?\n## Verification Log\r?\n\r?\n([\s\S]*?)\r?\n\r?\n## Confirmed Findings\r?\n/u;

/** Decision column of canonical verification rows; consumed with matchAll. */
const VERIFICATION_DECISION_PATTERN =
  /^\| [^|]+ \| [^|]+ \| (CONFIRMED|REFUTED|INDETERMINATE) \|/gmu;

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
  const frontmatter = report ? parseSealedReviewFrontmatter(report) : null;
  if (!report || !frontmatter) return null;

  const readCount = (key: string): number | null => {
    const value = frontmatter.get(key);
    return value !== undefined && COUNT_PATTERN.test(value)
      ? Number.parseInt(value, 10)
      : null;
  };
  const filesTotal = readCount('files_total');
  const filesReviewed = readCount('files_reviewed');
  const filesSkipped = readCount('files_skipped');
  if (
    frontmatter.get('verdict') !== verdict ||
    filesTotal === null ||
    filesReviewed === null ||
    filesSkipped === null
  )
    return null;

  const verificationLog = report.match(VERIFICATION_LOG_PATTERN)?.[1];
  if (verificationLog === undefined) return null;
  const decisions = Array.from(
    verificationLog.matchAll(VERIFICATION_DECISION_PATTERN),
    (match) => match[1],
  );
  return {
    verdict,
    ...(frontmatter.has('review_complete')
      ? { reviewComplete: frontmatter.get('review_complete') === 'true' }
      : {}),
    filesTotal,
    filesReviewed,
    filesSkipped,
    confirmed: decisions.filter((decision) => decision === 'CONFIRMED').length,
    refuted: decisions.filter((decision) => decision === 'REFUTED').length,
    indeterminate: decisions.filter((decision) => decision === 'INDETERMINATE')
      .length,
  };
}
