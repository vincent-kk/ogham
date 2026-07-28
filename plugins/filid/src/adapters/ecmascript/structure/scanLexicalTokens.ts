export type LexicalTokenKind =
  'identifier' | 'number' | 'punctuation' | 'string' | 'template';

export interface LexicalToken {
  kind: LexicalTokenKind;
  value: string;
  start: number;
  end: number;
  parenDepth: number;
  braceDepth: number;
  bracketDepth: number;
}

function isIdentifierStart(character: string): boolean {
  return /[A-Za-z_$]/.test(character);
}

function readQuoted(
  source: string,
  start: number,
  quote: string,
): { end: number; value: string; dynamicTemplate: boolean } {
  let cursor = start + 1;
  let value = '';
  let dynamicTemplate = false;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === '\\') {
      if (cursor + 1 < source.length) value += source[cursor + 1];
      cursor += 2;
      continue;
    }
    if (quote === '`' && character === '$' && source[cursor + 1] === '{')
      dynamicTemplate = true;
    if (character === quote) return { end: cursor + 1, value, dynamicTemplate };
    value += character;
    cursor += 1;
  }
  return { end: source.length, value, dynamicTemplate: true };
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
    if (character === "'" || character === '"' || character === '`') {
      const quoted = readQuoted(source, cursor, character);
      tokens.push({
        kind:
          character === '`' && quoted.dynamicTemplate ? 'template' : 'string',
        value: quoted.value,
        start: cursor,
        end: quoted.end,
        ...tokenDepth,
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
