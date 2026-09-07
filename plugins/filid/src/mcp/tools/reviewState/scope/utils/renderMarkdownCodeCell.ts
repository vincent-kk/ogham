import { escapeMarkdownCell } from './escapeMarkdownCell.js';

/** Consecutive backticks determine the surrounding CommonMark delimiter length. */
const BACKTICK_PATTERN = /`+/g;

/**
 * Wrap an evidence value in an escaped Markdown table code span.
 * @param value Raw path, rule, or diagnostic identifier to display as code.
 * @returns One inline code span with a delimiter longer than any content run.
 */
export function renderMarkdownCodeCell(value: string): string {
  const content = escapeMarkdownCell(value);
  const longest = Math.max(
    0,
    ...Array.from(content.matchAll(BACKTICK_PATTERN), ([run]) => run.length),
  );
  const delimiter = '`'.repeat(longest + 1);
  return longest === 0
    ? `${delimiter}${content}${delimiter}`
    : `${delimiter} ${content} ${delimiter}`;
}
