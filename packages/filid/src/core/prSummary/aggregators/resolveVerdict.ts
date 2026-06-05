import { extractRevalidateVerdict } from './extractRevalidateVerdict.js';
import { extractVerdict } from './extractVerdict.js';

export { extractVerdict } from './extractVerdict.js';
export { extractRevalidateVerdict } from './extractRevalidateVerdict.js';

/** review-report.md와 re-validate.md에서 최종 verdict를 결정한다. */
export function resolveVerdict(
  reviewReportContent: string | null,
  revalidateContent: string | null,
): string {
  let verdict = 'UNKNOWN';
  if (reviewReportContent) {
    verdict = extractVerdict(reviewReportContent);
  }
  if (revalidateContent) {
    const revalidateVerdict = extractRevalidateVerdict(revalidateContent);
    if (revalidateVerdict !== 'UNKNOWN') {
      verdict = revalidateVerdict;
    }
  }
  return verdict;
}
