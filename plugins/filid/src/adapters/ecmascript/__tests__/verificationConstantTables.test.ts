import { describe, expect, it } from 'vitest';

import { countSemanticCases } from '../index.js';

describe('ecmascript constant verification tables', () => {
  it('counts a top-level constant array', () => {
    expect(
      countSemanticCases(
        "const ROWS = [1, 2, 3]; it.each(ROWS)('row', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 3 });
  });

  it('counts a constant table with the provider fixture read patterns', () => {
    expect(
      countSemanticCases(`
        const PROVIDERS = ['a', 'b', 'c'] as const;
        it.each(PROVIDERS)('provider', () => {});
        it('budgets', () => {
          for (const provider of PROVIDERS) readDoc(provider);
          const docs = PROVIDERS.map((provider) => readDoc(provider));
        });
      `),
    ).toMatchObject({ certainty: 'exact', exactCount: 4 });
  });

  it('reuses a table in cases and parameterized suites', () => {
    expect(
      countSemanticCases(`
        const ROWS = [1, 2];
        it.concurrent.each(ROWS)('row', () => {});
        describe.each(ROWS)('suite', () => { it('case', () => {}); });
      `),
    ).toMatchObject({ certainty: 'exact', exactCount: 4 });
  });

  it('counts an empty constant table', () => {
    expect(
      countSemanticCases("const ROWS = []; it.each(ROWS)('row', () => {});"),
    ).toMatchObject({ certainty: 'exact', exactCount: 0 });
  });

  it('counts constant object rows with spread behind type arguments', () => {
    expect(
      countSemanticCases(
        "const ROWS = [{ ...first }, { ...second }] as const; it.each<{ run: (value: number) => void }>(ROWS)('row', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('ignores names in comments and strings and accepts unparenthesized map callbacks', () => {
    expect(
      countSemanticCases(`
        const ROWS = [1, 2];
        // ROWS.push(3);
        const text = 'ROWS';
        const labels = ROWS.map(value => String(value));
        test.each(ROWS)('row', () => {});
      `),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it.each([
    ['mutable declaration', 'let ROWS = [1, 2];'],
    ['dynamic initializer', 'const ROWS = loadRows();'],
    ['computed initializer', 'const ROWS = [1, 2].filter(keep);'],
    ['outer spread', 'const ROWS = [...other];'],
    ['alias', 'const ROWS = [1, 2]; const alias = ROWS;'],
    ['unknown argument', 'const ROWS = [1, 2]; configure(ROWS);'],
    ['push', 'const ROWS = [1, 2]; ROWS.push(3);'],
    ['splice', 'const ROWS = [1, 2]; ROWS.splice(0, 1);'],
    ['length assignment', 'const ROWS = [1, 2]; ROWS.length = 0;'],
    ['index assignment', 'const ROWS = [1, 2]; ROWS[0] = 3;'],
    ['element deletion', 'const ROWS = [1, 2]; delete ROWS[0];'],
    [
      'shadowed name',
      "const ROWS = [1, 2]; describe('scope', () => { const ROWS = [9]; });",
    ],
    ['imported binding', "import { ROWS } from './rows';"],
    ['exported declaration', 'export const ROWS = [1, 2];'],
    ['exported reference', 'const ROWS = [1, 2]; export { ROWS };'],
    [
      'map callback array argument',
      'const ROWS = [1, 2]; ROWS.map((value, index, array) => array.push(value));',
    ],
    ['unknown map callback', 'const ROWS = [1, 2]; ROWS.map(callback);'],
    ['unknown each consumer', 'const ROWS = [1, 2]; configure.each(ROWS);'],
    ['unrecognized read', 'const ROWS = [1, 2]; ROWS.slice();'],
    ['direct eval', "const ROWS = [1, 2]; eval('ROWS.push(3)');"],
    ['parenthesized eval', "const ROWS = [1, 2]; (eval)('ROWS.push(3)');"],
    [
      'dynamic function',
      "const ROWS = [1, 2]; new Function('ROWS.push(3)')();",
    ],
  ])('keeps %s indeterminate', (_name, declaration) => {
    expect(
      countSemanticCases(`${declaration} it.each(ROWS)('row', () => {});`),
    ).toMatchObject({ certainty: 'indeterminate', exactCount: undefined });
  });

  it('rejects a reference before its declaration', () => {
    expect(
      countSemanticCases(
        "it.each(ROWS)('row', () => {}); const ROWS = [1, 2];",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('leaves nested declarations indeterminate', () => {
    expect(
      countSemanticCases(
        "describe('scope', () => { const ROWS = [1, 2]; it.each(ROWS)('row', () => {}); });",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('does not treat a transformed reference as the original table', () => {
    expect(
      countSemanticCases(
        "const ROWS = [1, 2]; it.each(ROWS.map(value => value).filter(keep))('row', () => {});",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('counts delimiter strings as constant table values', () => {
    expect(
      countSemanticCases(
        "const ROWS = [']', ',']; it.each(ROWS)('row', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });
});
