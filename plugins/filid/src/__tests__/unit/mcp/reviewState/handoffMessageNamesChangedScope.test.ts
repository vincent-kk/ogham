import { describe, expect, it } from 'vitest';

import { handoffMessageNamesChangedScope } from '../../../../mcp/tools/reviewState/scope/handoffMessageNamesChangedScope.js';

describe('handoffMessageNamesChangedScope', () => {
  it('does not match the project-root sentinel as a literal period', () => {
    expect(
      handoffMessageNamesChangedScope('Review the project-wide . finding.', [
        '.',
      ]),
    ).toBe(false);
  });

  it('matches a Hangul path bounded by supported delimiters', () => {
    expect(
      handoffMessageNamesChangedScope(
        'Review `plugins/한글/파일.ts` before merge.',
        ['plugins/한글/파일.ts'],
      ),
    ).toBe(true);
  });
});
