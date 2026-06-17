import { describe, expect, it } from 'vitest';

import { checkExecutable } from '../checkExecutable.js';

describe('checkExecutable', () => {
  it('reports an installed binary as available with a version string', async () => {
    const status = await checkExecutable('node');
    expect(status.available).toBe(true);
    expect(typeof status.version).toBe('string');
    expect(status.version).toMatch(/\d+\.\d+\.\d+/);
  });

  it('reports a missing binary as unavailable', async () => {
    const status = await checkExecutable('cennad-nonexistent-bin-xyz-12345');
    expect(status.available).toBe(false);
    expect(status.version).toBeUndefined();
  });
});
