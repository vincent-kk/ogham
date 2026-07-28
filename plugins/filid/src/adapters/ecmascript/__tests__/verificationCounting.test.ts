import { describe, expect, it } from 'vitest';

import { countSemanticCases } from '../index.js';

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
});
