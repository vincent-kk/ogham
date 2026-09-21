import { describe, expect, it } from 'vitest';

import { sortScopeDiagnostics } from '../../../../mcp/tools/reviewState/scope/utils/sortScopeDiagnostics.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';

/**
 * One scope diagnostic of the fixture.
 * @param code Diagnostic code.
 * @param path Project-relative path, or undefined for a project-wide one.
 * @returns Diagnostic.
 */
function diagnostic(code: string, path?: string): ToolDiagnostic {
  return {
    code,
    message: `${code} at ${path ?? 'the project'}`,
    ...(path ? { path } : {}),
    affects: ['dependencies', 'boundaries'],
    nextAction: 'Fix it, then run again.',
  };
}

describe('scope diagnostics order', () => {
  it('sorts by code, then path, then message whatever the producer order', () => {
    expect(
      sortScopeDiagnostics([
        diagnostic('unresolved-local-dependency', 'src/b.ts'),
        diagnostic('config-warning'),
        diagnostic('unresolved-local-dependency', 'src/a.ts'),
      ]).map(({ code, path }) => `${code} ${path ?? ''}`),
    ).toEqual([
      'config-warning ',
      'unresolved-local-dependency src/a.ts',
      'unresolved-local-dependency src/b.ts',
    ]);
  });
});
