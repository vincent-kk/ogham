import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import type {
  ReviewSealSummary,
  ReviewVerdict,
} from '../../verdict/reviewVerdictTypes.js';

/** Canonical LF-delimited frontmatter at the start of a sealed report. */
const SEALED_FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/u;

/** Persisted total file count in canonical report metadata. */
const FILES_TOTAL_PATTERN = /^files_total: (\d+)$/mu;

/** Persisted reviewed file count in canonical report metadata. */
const FILES_REVIEWED_PATTERN = /^files_reviewed: (\d+)$/mu;

/** Persisted skipped file count in canonical report metadata. */
const FILES_SKIPPED_PATTERN = /^files_skipped: (\d+)$/mu;

/** Verdict scalar compared with the sealed state before trusting report counts. */
const SEALED_VERDICT_PATTERN = /^verdict: (.+)$/mu;

/** Verification table bounded by the canonical report section headings. */
const VERIFICATION_LOG_PATTERN =
  /\n## Verification Log\n\n([\s\S]*?)\n\n## Confirmed Findings\n/u;

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
  const frontmatter = report?.match(SEALED_FRONTMATTER_PATTERN)?.[1];
  if (!report || !frontmatter) return null;

  const readCount = (pattern: RegExp): number | null => {
    const match = frontmatter.match(pattern);
    return match ? Number.parseInt(match[1]!, 10) : null;
  };
  const filesTotal = readCount(FILES_TOTAL_PATTERN);
  const filesReviewed = readCount(FILES_REVIEWED_PATTERN);
  const filesSkipped = readCount(FILES_SKIPPED_PATTERN);
  if (
    frontmatter.match(SEALED_VERDICT_PATTERN)?.[1] !== verdict ||
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
    filesTotal,
    filesReviewed,
    filesSkipped,
    confirmed: decisions.filter((decision) => decision === 'CONFIRMED').length,
    refuted: decisions.filter((decision) => decision === 'REFUTED').length,
    indeterminate: decisions.filter((decision) => decision === 'INDETERMINATE')
      .length,
  };
}
