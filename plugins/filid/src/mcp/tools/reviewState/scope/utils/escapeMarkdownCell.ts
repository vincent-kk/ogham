/**
 * Escape untrusted text for one Markdown table cell.
 * @param value Raw path, rule, or message text.
 * @returns Single-line text with table separators escaped.
 */
export function escapeMarkdownCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}
