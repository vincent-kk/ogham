import { describe, expect, it } from 'vitest';

import { getParentPid } from '../parentPid.js';

describe('getParentPid', () => {
  it('returns a non-negative integer for the current process', () => {
    const ppid = getParentPid();
    expect(Number.isInteger(ppid)).toBe(true);
    expect(ppid).toBeGreaterThan(0);
  });
});
