import { describe, expect, it } from 'vitest';

import { scopeDiagnosticsToPaths } from '../../../mcp/tools/utils/scopeDiagnosticsToPaths.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

const OWNER = '/project/feature';
const SIBLING = '/project/sibling';

const INSIDE: ToolDiagnostic = {
  code: 'inside',
  message: 'under the scoped root',
  path: `${OWNER}/nested/source.unit`,
};
const OUTSIDE: ToolDiagnostic = {
  code: 'outside',
  message: 'in an unrelated subtree',
  path: `${SIBLING}/source.unit`,
};
const PATHLESS: ToolDiagnostic = {
  code: 'global',
  message: 'no path at all',
};
const ANCESTOR_DOCUMENT: ToolDiagnostic = {
  code: 'ancestor-document',
  message: 'an ancestor document above the scoped root',
  path: '/project/INTENT.md',
};

describe('scopeDiagnosticsToPaths', () => {
  it('keeps diagnostics under a scoped root and drops the rest', () => {
    const result = scopeDiagnosticsToPaths([INSIDE, OUTSIDE], [OWNER]);

    expect(result.scoped).toEqual([INSIDE]);
    expect(result.outOfScope).toBe(1);
  });

  it('keeps pathless diagnostics, which no root can exclude', () => {
    const result = scopeDiagnosticsToPaths([PATHLESS, OUTSIDE], [OWNER]);

    expect(result.scoped).toEqual([PATHLESS]);
  });

  it('keeps an exact address that sits outside every scoped root', () => {
    const result = scopeDiagnosticsToPaths(
      [ANCESTOR_DOCUMENT],
      [OWNER],
      ['/project/INTENT.md'],
    );

    expect(result.scoped).toEqual([ANCESTOR_DOCUMENT]);
    expect(result.outOfScope).toBe(0);
  });

  it('drops everything with a path when no root is given', () => {
    const result = scopeDiagnosticsToPaths([INSIDE, OUTSIDE, PATHLESS], []);

    expect(result.scoped).toEqual([PATHLESS]);
    expect(result.outOfScope).toBe(2);
  });

  it('counts nothing out of scope when every diagnostic belongs', () => {
    const result = scopeDiagnosticsToPaths([INSIDE], [OWNER, SIBLING]);

    expect(result.outOfScope).toBe(0);
  });
});
