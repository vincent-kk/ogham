import { describe, expect, it } from 'vitest';

import { createRetryStormDetector } from '../createRetryStormDetector.js';

describe('createRetryStormDetector', () => {
  it('returns false below the retry threshold', () => {
    const detect = createRetryStormDetector(2);
    expect(detect('Retrying after 5s', 'Retrying after 5s')).toBe(false);
  });

  it('returns true once retries reach the threshold', () => {
    const detect = createRetryStormDetector(2);
    const accumulated = 'Retrying after 5s\nRetrying after 9s';
    expect(detect('Retrying after 9s', accumulated)).toBe(true);
  });

  it('ignores output without the retry marker', () => {
    const detect = createRetryStormDetector(2);
    expect(detect('working hard...', 'working hard...')).toBe(false);
  });
});
