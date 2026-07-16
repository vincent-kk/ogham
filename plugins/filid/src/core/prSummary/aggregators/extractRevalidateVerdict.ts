/** re-validate.md에서 verdict를 추출한다. */
export function extractRevalidateVerdict(content: string): string {
  // Frontmatter first — same rationale as extractVerdict: the body lines are
  // presentation and tolerate extra bold wrapping.
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = content.slice(0, end).match(/^verdict:\s*(PASS|FAIL)\b/m);
      if (fm) return fm[1];
    }
  }

  const headerMatch = content.match(/—\s*(PASS|FAIL)/);
  if (headerMatch) return headerMatch[1];

  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*\**\s*(PASS|FAIL)/);
  if (verdictMatch) return verdictMatch[1];

  const finalMatch = content.match(
    /\*\*Final Verdict\*\*:\s*\**\s*(PASS|FAIL)/,
  );
  if (finalMatch) return finalMatch[1];

  return 'UNKNOWN';
}
