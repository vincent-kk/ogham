import { describe, expect, it } from 'vitest';

import { scanLexicalTokens } from '../index.js';

function shapes(source: string): string[] {
  return scanLexicalTokens(source).map(({ kind, value }) => `${kind}:${value}`);
}

describe('ecmascript lexical scanning of regex literals and strings', () => {
  it('reads a regex literal through its class, escapes and flags', () => {
    expect(shapes('const re = /[/\\]\'"]\\/x/gi; next')).toEqual([
      'identifier:const',
      'identifier:re',
      'punctuation:=',
      'regex:/[/\\]\'"]\\/x/gi',
      'punctuation:;',
      'identifier:next',
    ]);
  });

  it('opens a regex literal at the start of the source', () => {
    expect(shapes("/'/.test(value)")[0]).toBe("regex:/'/");
  });

  it('reads a slash after a closing delimiter as division', () => {
    expect(shapes('f(a) / b / c')).toEqual([
      'identifier:f',
      'punctuation:(',
      'identifier:a',
      'punctuation:)',
      'punctuation:/',
      'identifier:b',
      'punctuation:/',
      'identifier:c',
    ]);
  });

  it('reads a slash right after < as a closing tag, not a regex', () => {
    expect(
      shapes('[<b>x</b>, <i>y</i>]').filter((shape) =>
        shape.startsWith('regex:'),
      ),
    ).toEqual([]);
  });

  it('reads a slash after a postfix operator as division', () => {
    expect(
      shapes('e[0]! / 6, (d)! / 5, a! / 2, b++ / 3, c-- / 4 / 1').filter(
        (shape) => shape.startsWith('regex:'),
      ),
    ).toEqual([]);
  });

  it('reads a slash after a non-ASCII identifier or a keyword-named property as division', () => {
    expect(
      shapes(
        'a = 총액 / 2 / 3; b = café / 2 / 3; c = range.in / 2 / 3; d = 총액! / 2 / 3',
      ).filter((shape) => shape.startsWith('regex:')),
    ).toEqual([]);
  });

  it('still opens a regex after a prefix operator and a spaced <', () => {
    expect(
      shapes(
        "!/'/.test(s); n < /'/.exec(s); return!/'/.test(s); n + +/'/.source",
      ).filter((shape) => shape === "regex:/'/"),
    ).toHaveLength(4);
  });

  it('falls back to punctuation when no closing slash ends the line', () => {
    expect(shapes('x = / y;\nnext')).toContain('punctuation:/');
    expect(shapes('x = / y;\nnext').at(-1)).toBe('identifier:next');
  });

  it('does not continue a regex literal past an escaped line break', () => {
    expect(
      shapes('x = /a\\\n/').filter((shape) => shape.startsWith('regex:')),
    ).toEqual([]);
  });

  it('ends a quoted string at an unescaped newline and flags it', () => {
    const [open, next] = scanLexicalTokens("'open\nnext");

    expect(open).toMatchObject({
      kind: 'string',
      value: 'open',
      unterminated: true,
    });
    expect(next).toMatchObject({ kind: 'identifier', value: 'next' });
  });

  it('flags a string left open at the end of the source', () => {
    expect(scanLexicalTokens('"open')[0]).toMatchObject({ unterminated: true });
  });

  it.each(['\n', '\r\n'])(
    'keeps a %j line continuation inside a terminated string',
    (lineBreak) => {
      const [token] = scanLexicalTokens(`'a\\${lineBreak}b'`);

      expect(token).toMatchObject({ kind: 'string' });
      expect(token.unterminated).toBeUndefined();
    },
  );
});
