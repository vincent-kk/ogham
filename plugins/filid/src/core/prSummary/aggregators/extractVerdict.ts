/** review-report.md에서 verdict를 추출한다. */
export function extractVerdict(content: string): string {
  // Frontmatter is the structured source of truth; the bold body line is
  // presentation and drifts (e.g. `**Verdict**: **APPROVED (with notes)**`
  // once broke the body-only regex and shipped an UNKNOWN header to a PR).
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      const fm = content
        .slice(0, end)
        .match(/^verdict:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)\b/m);
      if (fm) return fm[1];
    }
  }

  const match = content.match(
    /\*\*Verdict\*\*:\s*\**\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)/,
  );
  return match?.[1] ?? 'UNKNOWN';
}
