import { describe, expect, it } from 'vitest';

import { isoNow } from '../isoNow.js';

describe('isoNow', () => {
  it('returns an ISO 8601 UTC timestamp', () => {
    expect(isoNow()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('round-trips through Date', () => {
    const stamp = isoNow();
    expect(new Date(stamp).toISOString()).toBe(stamp);
  });
});
