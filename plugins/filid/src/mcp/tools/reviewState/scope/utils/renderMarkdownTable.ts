/**
 * Render a canonical Markdown table or an explicit empty observation marker.
 * @param headers Ordered table headings.
 * @param rows Already escaped table cell rows.
 * @param emptyAsNone Whether an empty table is represented by `none`.
 * @returns Markdown table text or the empty marker.
 */
export function renderMarkdownTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  emptyAsNone = false,
): string {
  if (emptyAsNone && rows.length === 0) return 'none';
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}
