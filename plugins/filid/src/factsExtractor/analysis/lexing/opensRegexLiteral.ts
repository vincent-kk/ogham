/** The fields of an already-scanned token that decide what a `/` after it means. */
interface PrecedingToken {
  kind: string;
  value: string;
  start: number;
  end: number;
}

/** Keywords that leave an operand expected, so a `/` after them opens a regex. */
const REGEX_PRECEDING_KEYWORDS = new Set([
  'await',
  'case',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);

/** Punctuation that closes an operand, so a `/` after it divides. */
const OPERAND_CLOSERS = new Set([')', ']', '}']);

/** Punctuation an operand can end with, so a `!` glued to it is postfix. */
const OPERAND_END_PUNCTUATION = new Set([')', ']']);

/**
 * An identifier character outside ASCII. The scanner reads only ASCII
 * identifiers, so `총액` or the `é` of `café` arrives as punctuation.
 */
const NON_ASCII_IDENTIFIER_PART = /[\p{ID_Continue}\uD800-\uDFFF]/u;

function endsOperand(token: PrecedingToken): boolean {
  if (token.kind === 'identifier')
    return !REGEX_PRECEDING_KEYWORDS.has(token.value);
  return (
    OPERAND_END_PUNCTUATION.has(token.value) ||
    NON_ASCII_IDENTIFIER_PART.test(token.value)
  );
}

function isPostfixOperator(
  previous: PrecedingToken,
  beforePrevious: PrecedingToken | undefined,
): boolean {
  if (!beforePrevious || beforePrevious.end !== previous.start) return false;
  if (previous.value === '+' || previous.value === '-')
    return beforePrevious.value === previous.value;
  return previous.value === '!' && endsOperand(beforePrevious);
}

/**
 * Decide whether a `/` opens a regex literal or divides.
 *
 * A `/` glued to `<` is a closing tag (`</a>`), and one after a postfix `!`,
 * `++` or `--` glued to an operand divides. A non-ASCII identifier character
 * and a keyword named as a property after `.` both end an operand. Reading any
 * of these as a regex would swallow the delimiters and quotes up to the next
 * `/` on the line.
 * @param slashStart - Offset of the `/`
 * @param previous - Last token before the `/`, if any
 * @param beforePrevious - Token before `previous`, if any
 * @returns True when an operand is expected at the `/`
 */
export function opensRegexLiteral(
  slashStart: number,
  previous: PrecedingToken | undefined,
  beforePrevious: PrecedingToken | undefined,
): boolean {
  if (!previous) return true;
  if (previous.kind === 'identifier')
    return (
      REGEX_PRECEDING_KEYWORDS.has(previous.value) &&
      beforePrevious?.value !== '.'
    );
  if (previous.kind !== 'punctuation') return false;
  if (NON_ASCII_IDENTIFIER_PART.test(previous.value)) return false;
  if (previous.value === '<' && previous.end === slashStart) return false;
  if (isPostfixOperator(previous, beforePrevious)) return false;
  return !OPERAND_CLOSERS.has(previous.value);
}
