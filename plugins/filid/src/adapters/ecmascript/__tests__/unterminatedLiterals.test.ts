import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  countSemanticCases,
  ecmascriptVerificationAdapter,
  scanLexicalTokens,
} from '../index.js';

const roots: string[] = [];

function writeCandidate(relativePath: string, content: string): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-unterminated-'));
  roots.push(root);
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

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
      await ecmascriptVerificationAdapter.classify(
        writeCandidate('label.test.tsx', LOST_TEMPLATE_WITH_CASES),
      ),
    ).toBe('test-record');
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
      await ecmascriptVerificationAdapter.classify(
        writeCandidate(
          'Note.test.tsx',
          "export const t = `${a ? <b>Don't</b> : b}`;\nexport const x = 1;\n",
        ),
      ),
    ).toBe('unsupported');
  });

  it('denies the role to a renamed file whose English text only looks like a case', async () => {
    expect(
      await ecmascriptVerificationAdapter.classify(
        writeCandidate(
          'Banner.test.tsx',
          "export const Banner = () => <p>Don't touch it (please)</p>;\n",
        ),
      ),
    ).toBe('unsupported');
  });

  it('denies the role to a renamed file whose template holds case-like prose', async () => {
    expect(
      await ecmascriptVerificationAdapter.classify(
        writeCandidate(
          'Tpl.test.tsx',
          "export const t = (x) => `${x ? <p>Don't touch it (please)</p> : null}`;\nexport const y = 1;\n",
        ),
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
