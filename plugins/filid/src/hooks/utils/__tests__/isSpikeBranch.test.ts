import { describe, expect, it } from 'vitest';

import { isSpikeBranch } from '../isSpikeBranch.js';

describe('isSpikeBranch', () => {
  it('accepts spike/* branches only', () => {
    expect(isSpikeBranch('spike/poc-1')).toBe(true);
    expect(isSpikeBranch('spike/nested/deep')).toBe(true);
  });

  it('rejects non-spike branches, lookalikes, and null (detached HEAD)', () => {
    expect(isSpikeBranch('main')).toBe(false);
    expect(isSpikeBranch('spike')).toBe(false);
    expect(isSpikeBranch('spikes/x')).toBe(false);
    expect(isSpikeBranch('feature/spike/x')).toBe(false);
    expect(isSpikeBranch(null)).toBe(false);
  });
});
