import { describe, expect, it } from 'vitest';

import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';

/** A project root as a Windows host spells it. */
const WINDOWS_ROOT = 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\filid-fixture';

describe('a path relativized against a Windows root', () => {
  it('is spelled the portable way, not the host way', () => {
    expect(
      toProjectRelativePath(
        WINDOWS_ROOT,
        `${WINDOWS_ROOT}\\domain\\c\\peek.ts`,
      ),
    ).toBe('domain/c/peek.ts');
  });

  it('answers with the current-directory marker for the root itself', () => {
    expect(toProjectRelativePath(WINDOWS_ROOT, WINDOWS_ROOT)).toBe('.');
  });
});
