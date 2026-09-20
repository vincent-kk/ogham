import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { scanLexicalTokens } from '../analysis/lexing/scanLexicalTokens.js';
import { scanSource } from '../analysis/scanSource.js';
import { countSemanticCases } from '../analysis/verification/countSemanticCases.js';
import { verificationFromSource } from '../analysis/verification/verificationFromSource.js';

/**
 * The role this text confirms for a file of that name.
 *
 * The same reading the extractor makes for a record: the name proposes the
 * role and the scan of the text confirms it. Nothing is written to disk — the
 * reading takes the text.
 * @param relativePath Name whose suffix proposes the role.
 * @param content The file's text.
 * @returns The confirmed role.
 */
function roleOf(relativePath: string, content: string): string {
  return verificationFromSource(
    join('/project', relativePath),
    scanSource(content),
  ).role;
}

/** A template expression loses track, and the cases after it ride inside the template. */
const LOST_TEMPLATE_WITH_CASES = [
  'function label(x) {',
  "  return `${x ? <b>Don't</b> : null}`;",
  '}',
  "it('one', () => {});",
  "it('two', () => {});",
  'const tail = `plain`;',
  '',
].join('\n');

describe('unterminated literals: lost track versus hidden syntax', () => {
  it('reports a template that lost track as indeterminate and keeps the role of its hidden cases', async () => {
    expect(countSemanticCases(LOST_TEMPLATE_WITH_CASES)).toMatchObject({
      certainty: 'indeterminate',
      knownLowerBound: 0,
    });
    expect(
      roleOf('label.test.tsx', LOST_TEMPLATE_WITH_CASES),
    ).toBe('test-record');
  });

  it('names the line, not the offset, of a lost-track reason', () => {
    const { reasons } = countSemanticCases(LOST_TEMPLATE_WITH_CASES);
    expect(reasons.some((reason) => reason.includes('at line 2'))).toBe(true);
    expect(reasons.some((reason) => reason.includes('at offset'))).toBe(false);
  });

  it('reports a block comment opened inside a swallowed span as lost track', () => {
    expect(
      countSemanticCases(
        "render(<p>Don't</p>); /* TODO:\n   it (later) should be tested\n*/\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('reports lost track nested inside a swallowed span', () => {
    expect(
      countSemanticCases(
        'render(<p>Don\'t "q</p>); /* TODO:\n it (later)\n*/\n',
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('keeps an exact count when a JSX apostrophe hides nothing', () => {
    expect(
      countSemanticCases(
        "render(<Button>Don't</Button>);\nit('a', () => {});\nit('b', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('denies the role to a renamed file whose only uncertainty is a lost template', async () => {
    expect(
      roleOf(
          'Note.test.tsx',
          "export const t = `${a ? <b>Don't</b> : b}`;\nexport const x = 1;\n",
        ),
    ).toBe('unsupported');
  });

  it('denies the role to a renamed file whose English text only looks like a case', async () => {
    expect(
      roleOf(
          'Banner.test.tsx',
          "export const Banner = () => <p>Don't touch it (please)</p>;\n",
        ),
    ).toBe('unsupported');
  });

  it('denies the role to a renamed file whose template holds case-like prose', async () => {
    expect(
      roleOf(
          'Tpl.test.tsx',
          "export const t = (x) => `${x ? <p>Don't touch it (please)</p> : null}`;\nexport const y = 1;\n",
        ),
    ).toBe('unsupported');
  });

  it('reports a case hidden behind a quote mispaired earlier on the same line', () => {
    expect(
      countSemanticCases(
        "render(<p>Don't</p>); it('x', () => {});\nit('y', () => {});\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate', knownLowerBound: 1 });
  });

  it('reports a case hidden behind a quote mispaired after a double-quoted attribute', () => {
    expect(
      countSemanticCases(
        "render(<p className=\"x\">Don't</p>); it('y', () => {});\nit('z', () => {});\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate', knownLowerBound: 1 });
  });

  it('reports a case hidden behind a quote mispaired after a URL attribute', () => {
    expect(
      countSemanticCases(
        "render(<a href=\"https://x.dev\">Don't</a>); it('y', () => {});\nit('z', () => {});\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate', knownLowerBound: 1 });
  });

  it('reports a block comment inside a mispaired string as lost track even after a regex-like string', () => {
    expect(
      countSemanticCases(
        "s = '= /'; label(<b>Don't<b>); /* TODO:\nit (later)\n*/\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('distrusts case text the scan read as code inside a mispaired string', () => {
    expect(
      countSemanticCases("render(<p className=\"x\">It's</p>); f('test(');\n"),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('reads 40,000 carriage-return lines of apostrophes in linear time', () => {
    const source = Array.from(
      { length: 40000 },
      () => "render(<p>Don't</p>);",
    ).join('\r');
    const started = performance.now();

    countSemanticCases(source);

    expect(performance.now() - started).toBeLessThan(5000);
  });

  it('distrusts an evenly mispaired line when another line is unterminated', () => {
    expect(
      countSemanticCases(
        "render(<p>Don't</p>);\nrender(<p>It's</p>); it('a', () => {}); render(<p>I'm</p>);\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('distrusts a line whose quote opens right after a word', () => {
    expect(
      countSemanticCases(
        "render(<p>It's</p>); it('a', () => {}); render(<p>I'm</p>);\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('distrusts a line of stray quotes in linear time', () => {
    const started = performance.now();

    expect(
      countSemanticCases("x'y' ".repeat(40000) + "it('a', () => {});\n"),
    ).toMatchObject({ certainty: 'indeterminate', knownLowerBound: 1 });
    expect(performance.now() - started).toBeLessThan(5000);
  });

  it('distrusts the line a stray string continues onto', () => {
    expect(
      countSemanticCases(
        "render(<p>Don't</p>); f('q'); s = \"a\\\nb\"; it('real', () => {});\n",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('trusts a string right after a keyword', () => {
    expect(
      countSemanticCases(
        'function f(k) { switch (k) { case"a": return"it(x)"; } }\nit(\'a\', () => {});\n',
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 1 });
  });

  it('reports a template lost in escaped backticks as indeterminate in linear time', () => {
    const started = performance.now();

    expect(
      countSemanticCases('const s = `' + '\\`'.repeat(5000) + '\n'),
    ).toMatchObject({ certainty: 'indeterminate' });
    expect(performance.now() - started).toBeLessThan(5000);
  });

  it('reads a long line of escaped quotes in linear time without inventing uncertainty', () => {
    const started = performance.now();

    expect(
      countSemanticCases("const s = '" + "a\\'".repeat(1600) + '\n'),
    ).toMatchObject({ certainty: 'exact', exactCount: 0 });
    expect(performance.now() - started).toBeLessThan(5000);
  });

  it('bounds template expression nesting without throwing', () => {
    const tokens = scanLexicalTokens(
      'const s = ' + '`${'.repeat(3000) + '1' + '}`'.repeat(3000) + ';',
    );

    expect(tokens.find(({ kind }) => kind === 'template')).toMatchObject({
      unterminated: true,
    });
  });

  it('reads 5,000 lines of mixed unterminated literals within five seconds', () => {
    const source = Array.from({ length: 5000 }, (_, index) =>
      index % 2 === 0
        ? "render(<p>Don't</p>);"
        : `const v${index} = \`a\${${index}}b\`;`,
    ).join('\n');
    const started = performance.now();

    scanLexicalTokens(source);
    countSemanticCases(source);

    expect(performance.now() - started).toBeLessThan(5000);
  });
});
