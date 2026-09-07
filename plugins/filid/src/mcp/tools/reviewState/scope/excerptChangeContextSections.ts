/**
 * Identify a line that ends a retained top-level PR body section.
 * @param line Candidate line after a matched section heading.
 * @returns Whether the line opens another section, disclosure, or comment.
 */
function isChangeContextSectionBoundary(line: string): boolean {
  const candidate = line.trimStart();
  return (
    candidate.startsWith('## ') ||
    candidate.startsWith('<details') ||
    candidate.startsWith('<!--')
  );
}

/**
 * Extract configured top-level sections from an untrusted PR body.
 * @param body Complete caller body whose matched line endings are normalized.
 * @param headings Exact trimmed headings in the order they should be rendered.
 * @returns Ordered excerpt and whether at least one configured heading matched.
 */
export function excerptChangeContextSections(
  body: string,
  headings: readonly string[],
): { excerpt: string; matched: boolean } {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const sections = headings.flatMap((heading) => {
    const start = lines.findIndex((line) => line.trim() === heading);
    if (start < 0) return [];
    let end = start + 1;
    while (
      end < lines.length &&
      !isChangeContextSectionBoundary(lines[end] ?? '')
    )
      end += 1;
    return [lines.slice(start, end).join('\n').trimEnd()];
  });
  return sections.length > 0
    ? { excerpt: sections.join('\n\n'), matched: true }
    : { excerpt: body, matched: false };
}
