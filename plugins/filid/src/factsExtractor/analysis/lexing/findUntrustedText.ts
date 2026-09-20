import type { LexicalToken } from './lexicalToken.js';

/**
 * Keywords a string may directly follow (`return"x"`, `case"a":`), so a
 * quote glued to one of them is no stray quote.
 */
const QUOTE_KEYWORDS = new Set([
  'await',
  'case',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'from',
  'import',
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

/**
 * A character an identifier can hold; no string opens right after one. It is
 * tested on one code point, never end-anchored: V8 in Node 26 fails `[…]$`
 * on a trailing surrogate pair.
 */
const IDENTIFIER_PART = /[\p{ID_Continue}$]/u;

/**
 * Whether a token opens on a stray quote: a `'` or `"` glued to a word that
 * is not a keyword (`Don't`), where valid code never starts a string.
 * @param source - Text the token was scanned from
 * @param token - Any token of `source`
 * @param previous - Token before `token`, if any
 * @returns True when the quote the token opens on cannot start a string
 */
function opensStrayQuote(
  source: string,
  token: LexicalToken,
  previous: LexicalToken | undefined,
): boolean {
  const quote = source[token.start];
  if (quote !== "'" && quote !== '"') return false;
  const before = [...source.substring(token.start - 2, token.start)];
  return (
    IDENTIFIER_PART.test(before.at(-1) ?? '') &&
    !QUOTE_KEYWORDS.has(previous?.value ?? '')
  );
}

/** A literal's extent, from its opening quote to just past its end. */
export interface LiteralRange {
  start: number;
  end: number;
}

/** Text the scanner read as literal content although it may be code. */
export interface UntrustedText {
  /** Lines holding an unterminated or stray `'` or `"`, each with every literal on that line. */
  lines: { start: number; end: number; literals: LiteralRange[] }[];
  /** Unterminated templates, whose content may run to the end of the source. */
  templates: LiteralRange[];
  /** Offset where the scanner lost track of token boundaries; `Infinity` when it never did. */
  lostTrackAt: number;
}

/**
 * Find the text mispaired quotes make untrustworthy.
 *
 * A line is untrusted when a `'` or `"` is left open at its break (`\n` or
 * `\r`), or when one opens right after a word character that is not a keyword
 * (`Don't`) — valid code never puts a string there, so the quote is stray even
 * when the line's quotes pair up evenly. A literal that crosses a line break
 * joins the lines it spans into one. From such a line's first quote on,
 * literal content may be code and code may be literal content. The scanner
 * lost track where that content holds `/*` or a backtick (either would
 * reshape the lines after it if it were code) and at every unterminated
 * template. Nothing is re-scanned, so the work stays linear.
 * @param source - Text the tokens were scanned from
 * @param tokens - Tokens of `source`, in order
 * @returns The untrusted lines and templates, and where tracking was lost
 */
export function findUntrustedText(
  source: string,
  tokens: readonly LexicalToken[],
): UntrustedText {
  const lines: UntrustedText['lines'] = [];
  const templates: LiteralRange[] = [];
  let lostTrackAt = Number.POSITIVE_INFINITY;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.unterminated && source[token.start] === '`') {
      templates.push({ start: token.start, end: token.end });
      lostTrackAt = Math.min(lostTrackAt, token.start);
      continue;
    }
    if (
      !token.unterminated &&
      !opensStrayQuote(source, token, tokens[index - 1])
    )
      continue;
    const last = lines[lines.length - 1];
    if (last && token.end <= last.end) continue;
    let end = token.end;
    while (end < source.length && source[end] !== '\n' && source[end] !== '\r')
      end += 1;
    if (last && token.start <= last.end) {
      last.end = end;
      continue;
    }
    let start = token.start;
    while (
      start > 0 &&
      source[start - 1] !== '\n' &&
      source[start - 1] !== '\r'
    )
      start -= 1;
    lines.push({ start, end, literals: [] });
  }

  let lineIndex = 0;
  for (const token of tokens) {
    if (token.kind !== 'string' && token.kind !== 'template') continue;
    if (token.unterminated && source[token.start] === '`') continue;
    while (lineIndex < lines.length && lines[lineIndex].end < token.start)
      lineIndex += 1;
    const line = lines[lineIndex];
    if (!line || token.start < line.start) continue;
    line.literals.push({ start: token.start, end: token.end });
    const content = source.slice(token.start + 1, token.end);
    if (content.includes('/*') || content.includes('`'))
      lostTrackAt = Math.min(lostTrackAt, token.start);
  }
  return { lines, templates, lostTrackAt };
}
