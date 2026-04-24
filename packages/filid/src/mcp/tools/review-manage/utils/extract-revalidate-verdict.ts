/**
 * Extract verdict from re-validate.md content, checking header
 * (`— PASS/FAIL`), `**Verdict**:`, then `**Final Verdict**:`.
 */
export function extractRevalidateVerdict(content: string): string {
  const patterns = [
    /—\s*(PASS|FAIL)/,
    /\*\*Verdict\*\*:\s*(PASS|FAIL)/,
    /\*\*Final Verdict\*\*:\s*(PASS|FAIL)/,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }
  return 'UNKNOWN';
}
