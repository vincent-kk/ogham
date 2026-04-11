/** review-report.md에서 verdict를 추출한다. */
function extractVerdict(content: string): string {
  const match = content.match(
    /\*\*Verdict\*\*:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)/,
  );
  return match?.[1] ?? 'UNKNOWN';
}

/** re-validate.md에서 verdict를 추출한다. */
function extractRevalidateVerdict(content: string): string {
  const headerMatch = content.match(/—\s*(PASS|FAIL)/);
  if (headerMatch) return headerMatch[1];

  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(PASS|FAIL)/);
  if (verdictMatch) return verdictMatch[1];

  const finalMatch = content.match(/\*\*Final Verdict\*\*:\s*(PASS|FAIL)/);
  if (finalMatch) return finalMatch[1];

  return 'UNKNOWN';
}

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
