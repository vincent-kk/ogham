/** re-validate.md에서 verdict를 추출한다. */
export function extractRevalidateVerdict(content: string): string {
  const headerMatch = content.match(/—\s*(PASS|FAIL)/);
  if (headerMatch) return headerMatch[1];

  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(PASS|FAIL)/);
  if (verdictMatch) return verdictMatch[1];

  const finalMatch = content.match(/\*\*Final Verdict\*\*:\s*(PASS|FAIL)/);
  if (finalMatch) return finalMatch[1];

  return 'UNKNOWN';
}
