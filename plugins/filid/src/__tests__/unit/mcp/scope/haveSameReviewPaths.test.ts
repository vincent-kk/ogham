import { describe, expect, it } from 'vitest';

import { haveSameReviewPaths } from '../../../../mcp/tools/reviewState/scope/utils/haveSameReviewPaths.js';

describe('review path identity', () => {
  it.each([
    { left: ['a', 'a'], right: ['a', 'b'], equal: false },
    { left: ['a', 'b'], right: ['a', 'a'], equal: false },
    { left: ['b', 'a'], right: ['a', 'b'], equal: true },
    { left: [], right: [], equal: true },
  ])('compares $left with $right', ({ left, right, equal }) => {
    expect(haveSameReviewPaths(left, right)).toBe(equal);
  });
});
