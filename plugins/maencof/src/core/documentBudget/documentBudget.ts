/** Measure complete Markdown; normalize newlines and exclude only closed opening frontmatter from body size. */
export function measureDocumentBudget(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const total_lines =
    normalized === '' ? 0 : normalized.replace(/\n$/, '').split('\n').length;
  const body = normalized.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, '');
  const body_chars = Array.from(body).length;
  const reasons: string[] = [];
  if (total_lines > 100) reasons.push('total_lines');
  if (body_chars > 6000) reasons.push('body_chars');
  return { total_lines, body_chars, exceeded: reasons.length > 0, reasons };
}

/** Return a non-destructive warning suitable for merging with existing CRUD warnings. */
export function documentBudgetWarnings(markdown: string): string[] {
  const budget = measureDocumentBudget(markdown);
  return budget.exceeded
    ? [
        `document_size_exceeded: total_lines=${budget.total_lines} (limit=100), body_chars=${budget.body_chars} (limit=6000). Rewrite repeated or superseded passages; split independent topics with /maencof:organize --maintenance. Preserve facts, conditions and source locations; do not truncate.`,
      ]
    : [];
}
