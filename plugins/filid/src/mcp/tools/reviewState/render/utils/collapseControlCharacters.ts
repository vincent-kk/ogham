/** LF and CRLF line endings, which no single rendered line may carry. */
const LINE_ENDING_PATTERN = /\r?\n/g;

/** ASCII control characters (built without a control-char regex literal). */
const CONTROL_CHAR_PATTERN = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(9)}${String.fromCharCode(11)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  'g',
);

/**
 * Flatten a value onto one line without control characters.
 *
 * Line endings are collapsed before the control-character pass, which spans
 * neither `\n` nor the `\r` that may precede it.
 * @param value Untrusted text or metadata bound for one rendered line.
 * @returns The value with every line ending and control character as a space.
 */
export function collapseControlCharacters(value: string): string {
  return value
    .replace(LINE_ENDING_PATTERN, ' ')
    .replace(CONTROL_CHAR_PATTERN, ' ');
}
