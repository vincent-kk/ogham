import { describe, expect, it } from 'vitest';

import { countSemanticCases } from '../analysis/verification/countSemanticCases.js';

describe('ecmascript semantic verification counting', () => {
  it('counts ordinary case declarations', () => {
    expect(
      countSemanticCases("it('a', () => {}); test('b', () => {});"),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('counts a skipped case as one', () => {
    expect(countSemanticCases("it.skip('a', () => {});")).toMatchObject({
      certainty: 'exact',
      exactCount: 1,
    });
  });

  it('counts a todo case as one', () => {
    expect(countSemanticCases("test.todo('later');")).toMatchObject({
      certainty: 'exact',
      exactCount: 1,
    });
  });

  it('counts a property declaration as one regardless of generated runs', () => {
    expect(
      countSemanticCases(
        "test.prop([integer()])('property', ([value]) => value === value);",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 1 });
  });

  it('counts static scalar parameter rows', () => {
    expect(
      countSemanticCases(
        "it.each([1, 2, 3])('row %s', (value) => expect(value).toBeTruthy());",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 3 });
  });

  it('counts static object parameter rows', () => {
    expect(
      countSemanticCases(
        "test.each([{ value: 1 }, { value: 2 }])('row', ({ value }) => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('counts object rows whose properties use spread', () => {
    expect(
      countSemanticCases(
        "it.each([{ ...seed, value: 1 }, { ...seed, value: 2 }])('row', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('counts tuple rows containing object spread', () => {
    expect(
      countSemanticCases(
        "it.each([['prepared', { ...state, verdict: 'APPROVED' }], ['sealed', { ...state, phase: 'sealed' }]])('rejects %s', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('counts tuple rows whose values use array spread', () => {
    expect(
      countSemanticCases("it.each([[...left], [...right]])('row', () => {});"),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('counts rows constructed with spread call arguments', () => {
    expect(
      countSemanticCases(
        "it.each([makeRow(...left), makeRow(...right)])('row', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('ignores ellipses in parameter table strings and comments', () => {
    expect(
      countSemanticCases(
        "it.each(['...', /* ... */ 'kept'])('row', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('keeps outer table spread indeterminate while preserving known cases', () => {
    expect(
      countSemanticCases(
        "it('known', () => {}); it.each([1, ...rows, 2])('row', () => {});",
      ),
    ).toMatchObject({
      certainty: 'indeterminate',
      exactCount: undefined,
      knownLowerBound: 1,
    });
  });

  it('multiplies suite cases when object rows use spread', () => {
    expect(
      countSemanticCases(
        "describe.each([{ ...first }, { ...second }])('suite', () => { it('one', () => {}); it('two', () => {}); });",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 4 });
  });

  it('counts tagged-template data rows without counting its header', () => {
    expect(
      countSemanticCases(
        "it.each`left | right\n1 | 2\n3 | 4`('row', ({ left }) => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('marks a dynamic parameter table indeterminate', () => {
    expect(
      countSemanticCases("it.each(loadRows())('row', () => {});"),
    ).toMatchObject({
      certainty: 'indeterminate',
      exactCount: undefined,
      knownLowerBound: 0,
    });
  });

  it('multiplies cases inside a static parameterized suite', () => {
    expect(
      countSemanticCases(
        "describe.each(['a', 'b'])('suite', () => { it('one', () => {}); test.each([1, 2])('row', () => {}); });",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 6 });
  });

  it('ignores case-like text in comments and strings', () => {
    expect(
      countSemanticCases(
        "// it('fake', () => {});\nconst text = \"test('fake', () => {})\";\nit('real', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 1 });
  });

  it('marks a case API alias indeterminate', () => {
    expect(
      countSemanticCases(
        "const scenario = it;\nscenario('wrapped', () => {});",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('counts focused and concurrent modifiers as one declaration each', () => {
    expect(
      countSemanticCases(
        "it.only('focused', () => {}); test.concurrent('parallel', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('counts an empty static parameter table as zero', () => {
    expect(
      countSemanticCases("it.each([])('never instantiated', () => {});"),
    ).toMatchObject({ certainty: 'exact', exactCount: 0 });
  });

  it('marks an interpolated tagged-template table indeterminate', () => {
    expect(
      countSemanticCases(
        "it.each`value\n${loadValue()}`('dynamic', ({ value }) => {});",
      ),
    ).toMatchObject({ certainty: 'indeterminate' });
  });

  it('counts static rows behind a type argument list', () => {
    expect(
      countSemanticCases(
        "it.each<{ value: number }>([{ value: 1 }, { value: 2 }])('row', ({ value }) => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('counts static rows behind a type argument list holding a function type', () => {
    expect(
      countSemanticCases(
        "it.each<{ run: (value: number) => void }>([{ run: noop }])('row', ({ run }) => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 1 });
  });

  it('counts cases on both sides of a regex literal whose class holds quotes', () => {
    expect(
      countSemanticCases(
        [
          "test('case 1', () => { assert.ok(true); });",
          "test('case 2', () => { assert.ok(true); });",
          '',
          'const IMPORT_PATTERN = /from\\s+["\']node:https?["\']/;',
          '',
          "test('case 3', () => { assert.match(\"from 'node:http'\", IMPORT_PATTERN); });",
          "test('case 4', () => { assert.ok(true); });",
          "test('case 5', () => { assert.ok(true); });",
        ].join('\n'),
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 5 });
  });

  it('counts cases after a regex literal holding one unpaired quote', () => {
    expect(
      countSemanticCases(
        [
          'const QUOTE = /["\']/;',
          '',
          "test('case 1', () => { assert.ok(QUOTE.test('\"')); });",
          "test('case 2', () => { assert.ok(true); });",
        ].join('\n'),
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });

  it('reads a regex literal after a keyword and a slash inside its class', () => {
    expect(
      countSemanticCases(
        "function pattern() { return /[/'\"]+/g; }\nit('after', () => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 1 });
  });

  it('counts a one-line JSX each table row by row', () => {
    expect(
      countSemanticCases(
        "it.each([<b>x</b>, <i>y</i>, <u>z</u>])('r %#', (n) => {});",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 3 });
  });

  it('keeps division from opening a regex literal', () => {
    expect(
      countSemanticCases(
        "const half = total / 2; it('between', () => {}); const third = total / 3;",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 1 });
  });

  it('reports a case hidden behind an unterminated string as indeterminate', () => {
    expect(
      countSemanticCases(
        "render(<p>Don't</p>); it(title, () => {});\nit('after', () => {});",
      ),
    ).toMatchObject({
      certainty: 'indeterminate',
      exactCount: undefined,
      knownLowerBound: 1,
    });
  });

  it('multiplies cases inside a static parameterized suite with a type argument', () => {
    expect(
      countSemanticCases(
        "describe.each<{ name: string }>([{ name: 'a' }, { name: 'b' }])('suite', () => { it('one', () => {}); });",
      ),
    ).toMatchObject({ certainty: 'exact', exactCount: 2 });
  });
});
