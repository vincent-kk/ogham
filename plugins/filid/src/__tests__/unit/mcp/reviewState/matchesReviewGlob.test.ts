import { describe, expect, it } from 'vitest';

import { matchesReviewGlob } from '../../../../mcp/tools/reviewState/rules/matchesReviewGlob.js';

describe('matchesReviewGlob', () => {
  it('lets a leading double-star directory prefix match root files', () => {
    expect(matchesReviewGlob('**/*.ts', 'root.ts')).toBe(true);
    expect(matchesReviewGlob('**/*.ts', 'src/root.ts')).toBe(true);
  });

  it('anchors the whole path', () => {
    expect(matchesReviewGlob('**/*.ts', 'src/root.ts.bak')).toBe(false);
    expect(
      matchesReviewGlob(
        '.github/workflows/*.yml',
        'nested/.github/workflows/ci.yml',
      ),
    ).toBe(false);
  });

  it('allows a star to match part of one path segment only', () => {
    expect(matchesReviewGlob('**/tsconfig*.json', 'tsconfig.build.json')).toBe(
      true,
    );
    expect(matchesReviewGlob('**/tsconfig*.json', 'tsconfig/build.json')).toBe(
      false,
    );
  });
});
