import { describe, expect, it } from 'vitest';

import { FilidConfigSchema } from '../../../../core/infra/configLoader/loaders/configSchemas.js';
import { selectReviewEffort } from '../../../../mcp/tools/reviewState/handlers/utils/selectReviewEffort.js';

describe('automatic review effort policy', () => {
  it.each([
    {
      mode: 'auto',
      count: 0,
      threshold: 16,
      effort: 'medium',
      reason: 'auto-standard',
    },
    {
      mode: 'auto',
      count: 15,
      threshold: 16,
      effort: 'medium',
      reason: 'auto-standard',
    },
    {
      mode: 'auto',
      count: 16,
      threshold: 16,
      effort: 'low',
      reason: 'auto-large',
    },
    {
      mode: 'auto',
      count: 46,
      threshold: 16,
      effort: 'low',
      reason: 'auto-large',
    },
    {
      mode: 'auto',
      count: 16,
      threshold: 17,
      effort: 'medium',
      reason: 'auto-standard',
    },
    { mode: 'low', count: 1, threshold: 16, effort: 'low', reason: 'fixed' },
    {
      mode: 'medium',
      count: 46,
      threshold: 16,
      effort: 'medium',
      reason: 'fixed',
    },
    { mode: 'high', count: 46, threshold: 16, effort: 'high', reason: 'fixed' },
  ] as const)(
    '$mode selects $effort for $count groups at $threshold',
    ({ mode, count, threshold, effort, reason }) => {
      expect(selectReviewEffort(mode, count, threshold)).toEqual({
        effort,
        effortMode: mode,
        effortReason: reason,
        autoLowEffortGroupThreshold: threshold,
      });
    },
  );

  it.each([0, -1, 1.5])(
    'rejects invalid automatic threshold %s',
    (threshold) => {
      expect(
        FilidConfigSchema.safeParse({
          version: '2.0',
          adapters: { mode: 'auto', enabled: [] },
          rules: {},
          review: { effort: 'auto', autoLowEffortGroupThreshold: threshold },
        }).success,
      ).toBe(false);
    },
  );

  it('preserves automatic review config without materializing runtime defaults', () => {
    const review = { effort: 'auto', autoLowEffortGroupThreshold: 24 };
    expect(
      FilidConfigSchema.parse({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        review,
      }).review,
    ).toEqual(review);
  });
});
