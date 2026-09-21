import { collapseControlCharacters } from './collapseControlCharacters.js';

/** Backtick runs, whose longest decides the fence able to hold the value. */
const BACKTICK_RUN_PATTERN = /`+/g;

/**
 * The longest run of consecutive backticks in a value.
 * @param value Text to measure.
 * @returns That run's length, or 0 when the value holds no backtick.
 */
function longestBacktickRun(value: string): number {
  return Math.max(
    0,
    ...Array.from(value.matchAll(BACKTICK_RUN_PATTERN), (run) => run[0].length),
  );
}

/**
 * Render a value that must be read back exactly as a Markdown code span.
 *
 * A path, an identifier or a JSON pointer is not prose: escaping it records a
 * value that is not the one it names — a backslash before every `_`, a `&#58;`
 * for every `:`, a `\~0` that no longer means `~`. A code span carries the
 * value untouched instead, and nothing inside one is Markdown, so untrusted
 * text cannot open a heading, a link or a list item from here. Not for a table
 * cell: GitHub reads `|` as a delimiter even inside a code span.
 * @param value Untrusted or generated text to preserve verbatim.
 * @returns The value in a fence longer than any backtick run it holds, padded
 * when it begins or ends with a backtick so the fence stays readable.
 */
export function renderCodeSpan(value: string): string {
  const content = collapseControlCharacters(value) || ' ';
  const fence = '`'.repeat(longestBacktickRun(content) + 1);
  const padding = content.startsWith('`') || content.endsWith('`') ? ' ' : '';
  return `${fence}${padding}${content}${padding}${fence}`;
}
