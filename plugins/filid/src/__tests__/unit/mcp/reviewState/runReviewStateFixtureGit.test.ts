import { spawnCliSync } from '@ogham/cross-platform';
import { describe, expect, it, vi } from 'vitest';

import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';

vi.mock('@ogham/cross-platform', () => ({ spawnCliSync: vi.fn() }));

describe('review fixture Git diagnostics', () => {
  it('preserves command, exit code, and stdout when stderr is empty', () => {
    vi.mocked(spawnCliSync).mockReturnValue({
      code: 128,
      stdout: 'stdout failure',
      stderr: '',
      timedOut: false,
    });
    expect(() => runReviewStateFixtureGit('/project', ['status'])).toThrow(
      /git status.*code=128.*stdout failure/,
    );
  });

  it('reports timed-out fixture processes even with a zero exit code', () => {
    vi.mocked(spawnCliSync).mockReturnValue({
      code: 0,
      stdout: '',
      stderr: '',
      timedOut: true,
    });
    expect(() => runReviewStateFixtureGit('/project', ['status'])).toThrow(
      /timedOut=true/,
    );
  });
});
