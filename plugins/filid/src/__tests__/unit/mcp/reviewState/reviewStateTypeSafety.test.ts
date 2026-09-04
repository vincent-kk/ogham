import { spawnCliSync } from '@ogham/cross-platform';
import { describe, expect, it } from 'vitest';

describe('review-state type safety', () => {
  it('contains no double casts that suppress checker narrowing', () => {
    const result = spawnCliSync(
      'git',
      [
        'grep',
        '-n',
        'as unknown as',
        '--',
        'src/mcp/tools/reviewState',
      ],
      { cwd: process.cwd() },
    );

    expect(result.stdout).toBe('');
    expect(result.code).toBe(1);
  });
});
