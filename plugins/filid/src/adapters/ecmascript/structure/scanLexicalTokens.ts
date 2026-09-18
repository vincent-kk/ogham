import { opensRegexLiteral } from './literals/opensRegexLiteral.js';
import { readQuotedLiteral } from './literals/readQuotedLiteral.js';
import { readRegexLiteral } from './literals/readRegexLiteral.js';

export type LexicalTokenKind =
  'identifier' | 'number' | 'punctuation' | 'regex' | 'string' | 'template';

export interface LexicalToken {
  kind: LexicalTokenKind;
  value: string;
  start: number;
  end: number;
  parenDepth: number;
  braceDepth: number;
  bracketDepth: number;
  /** Set on a string or template the source never closes: every later token boundary is a guess. */
  unterminated?: true;
}

function isIdentifierStart(character: string): boolean {
  return /[A-Za-z_$]/.test(character);
}

export function scanLexicalTokens(source: string): LexicalToken[] {
  const tokens: LexicalToken[] = [];
  let cursor = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

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
      cursor += 2;
      while (
        cursor < source.length &&
        !(source[cursor] === '*' && source[cursor + 1] === '/')
      )
        cursor += 1;
      cursor = Math.min(source.length, cursor + 2);
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
      const quoted = readQuotedLiteral(source, cursor, character);
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

  return tokens;
}
