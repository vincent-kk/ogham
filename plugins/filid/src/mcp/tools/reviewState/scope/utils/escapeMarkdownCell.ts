/** LF and CRLF line endings collapsed to keep a Markdown table row intact. */
const TABLE_NEWLINE_PATTERN = /\r?\n/g;

/** Table delimiters that must be escaped inside one cell. */
const TABLE_SEPARATOR_PATTERN = /\|/g;

/**
 * Escape untrusted text for one Markdown table cell.
 * @param value Raw path, rule, or message text.
 * @returns Single-line text with table separators escaped.
 */
export function escapeMarkdownCell(value: string): string {
  return value
    .replace(TABLE_NEWLINE_PATTERN, ' ')
    .replace(TABLE_SEPARATOR_PATTERN, '\\|');
}
