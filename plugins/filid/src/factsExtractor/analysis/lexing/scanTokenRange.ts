import { MAX_TEMPLATE_NESTING } from '../../../adapters/ecmascript/structure/ecmascriptConventions.js';

import type { LexicalToken, TokenRange } from './lexicalToken.js';
import { opensRegexLiteral } from './opensRegexLiteral.js';
import { readQuotedLiteral } from './readQuotedLiteral.js';
import { readRegexLiteral } from './readRegexLiteral.js';

function isIdentifierStart(character: string): boolean {
  return /[A-Za-z_$]/.test(character);
}

function readTemplateExpression(
  source: string,
  from: number,
  nesting: number,
): { end: number; reliable: boolean } {
  if (nesting >= MAX_TEMPLATE_NESTING)
    return { end: source.length, reliable: false };
  const range = scanTokenRange(source, from, true, nesting + 1);
  const reliable =
    range.closed && !range.tokens.some((token) => token.unterminated);
  return { end: range.end, reliable };
}

/**
 * Scan tokens from `start` to the end of `source`, or to the first unmatched
 * `}` when the range is a template expression.
 *
 * A template's `${…}` is read by this same scanner, so the regexes, quotes and
 * nested templates inside it cannot move the template's own boundary.
 * @param source - Full source text
 * @param start - Offset where scanning begins
 * @param closesAtUnmatchedBrace - Stop after a `}` at brace depth 0, as the end of `${…}`
 * @param nesting - How many template expressions enclose `start`; past
 * `MAX_TEMPLATE_NESTING` the innermost expression reads as lost track
 * @returns The tokens, the offset just past the range, and whether an unmatched
 * `}` closed it or a block comment ran to the end of the source
 */
export function scanTokenRange(
  source: string,
  start: number,
  closesAtUnmatchedBrace: boolean,
  nesting = 0,
): TokenRange {
  const tokens: LexicalToken[] = [];
  let cursor = start;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let unclosedComment = false;

  while (cursor < source.length) {
    const character = source[cursor];
    const next = source[cursor + 1] ?? '';
    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }
    if (character === '/' && next === '/') {
      cursor += 2;
      while (cursor < source.length && source[cursor] !== '\n') cursor += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      const close = source.indexOf('*/', cursor + 2);
      unclosedComment ||= close < 0;
      cursor = close < 0 ? source.length : close + 2;
      continue;
    }

    const tokenDepth = { parenDepth, braceDepth, bracketDepth };
    if (
      character === '/' &&
      opensRegexLiteral(
        cursor,
        tokens[tokens.length - 1],
        tokens[tokens.length - 2],
      )
    ) {
      const end = readRegexLiteral(source, cursor);
      if (end >= 0) {
        tokens.push({
          kind: 'regex',
          value: source.slice(cursor, end),
          start: cursor,
          end,
          ...tokenDepth,
        });
        cursor = end;
        continue;
      }
    }
    if (character === "'" || character === '"' || character === '`') {
      const quoted = readQuotedLiteral(source, cursor, character, (from) =>
        readTemplateExpression(source, from, nesting),
      );
      tokens.push({
        kind:
          character === '`' && quoted.dynamicTemplate ? 'template' : 'string',
        value: quoted.value,
        start: cursor,
        end: quoted.end,
        ...tokenDepth,
        ...(quoted.terminated ? {} : { unterminated: true as const }),
      });
      cursor = quoted.end;
      continue;
    }
    if (isIdentifierStart(character)) {
      let end = cursor + 1;
      while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) end += 1;
      tokens.push({
        kind: 'identifier',
        value: source.slice(cursor, end),
        start: cursor,
        end,
        ...tokenDepth,
      });
      cursor = end;
      continue;
    }
    if (/[0-9]/.test(character)) {
      let end = cursor + 1;
      while (end < source.length && /[0-9A-Fa-f_xX.]/.test(source[end]))
        end += 1;
      tokens.push({
        kind: 'number',
        value: source.slice(cursor, end),
        start: cursor,
        end,
        ...tokenDepth,
      });
      cursor = end;
      continue;
    }
    if (character === '}' && closesAtUnmatchedBrace && braceDepth === 0)
      return { tokens, end: cursor + 1, closed: true, unclosedComment };

    const value =
      (character === '=' || character === '?' || character === '.') &&
      next === character
        ? character + next
        : character === '=' && next === '>'
          ? '=>'
          : character;
    tokens.push({
      kind: 'punctuation',
      value,
      start: cursor,
      end: cursor + value.length,
      ...tokenDepth,
    });
    if (character === '(') parenDepth += 1;
    else if (character === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (character === '{') braceDepth += 1;
    else if (character === '}') braceDepth = Math.max(0, braceDepth - 1);
    else if (character === '[') bracketDepth += 1;
    else if (character === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    cursor += value.length;
  }

  return { tokens, end: source.length, closed: false, unclosedComment };
}
