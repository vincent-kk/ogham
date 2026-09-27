import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sweepStaleTasks } from '../../../core/gates/index.js';
import { sweepStaleActors } from '../../../core/sessionSignals/index.js';
import { bootSweep } from '../lifecycle/bootSweep.js';

vi.mock('../../../core/gates/index.js', () => ({ sweepStaleTasks: vi.fn() }));
vi.mock('../../../core/sessionSignals/index.js', () => ({
  sweepStaleActors: vi.fn(),
}));

describe('bootSweep', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls each owner in order with the same root and time', () => {
    bootSweep('/repo', 123);
    expect(sweepStaleActors).toHaveBeenCalledExactlyOnceWith('/repo', 123);
    expect(sweepStaleTasks).toHaveBeenCalledExactlyOnceWith('/repo', 123);
    expect(
      vi.mocked(sweepStaleActors).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(sweepStaleTasks).mock.invocationCallOrder[0]!);
  });

  it('continues with tasks when actor cleanup throws', () => {
    vi.mocked(sweepStaleActors).mockImplementation(() => {
      throw new Error('actor failure');
    });
    expect(() => bootSweep('/repo', 123)).not.toThrow();
    expect(sweepStaleTasks).toHaveBeenCalledExactlyOnceWith('/repo', 123);
  });

  it('contains task cleanup failures', () => {
    vi.mocked(sweepStaleTasks).mockImplementation(() => {
      throw new Error('task failure');
    });
    expect(() => bootSweep('/repo', 123)).not.toThrow();
  });
});
