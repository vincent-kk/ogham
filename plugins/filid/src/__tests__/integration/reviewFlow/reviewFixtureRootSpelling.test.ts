import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readReviewState } from '../../../mcp/tools/reviewState/state/readReviewState.js';
import type { ReviewStateRecord } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { normalizeReviewStateText } from './helpers/normalizeReviewStateText.js';
import { copyPreservedTreeWithRoots } from './helpers/utils/copyPreservedTreeWithRoots.js';

/** The preserved review state, root placeholders and all. */
const PRESERVED_STATE = fileURLToPath(
  new URL('./fixtures/preserved-s0/review-state.json', import.meta.url),
);

/**
 * Roots as a Windows host spells them.
 *
 * The backslash is the one separator JSON escapes, so a root spelled this way
 * reaches a JSON artifact and a serialized state under a second spelling that
 * a POSIX root can never produce. Written out rather than taken from the host
 * so the case runs everywhere.
 */
const WINDOWS_ROOTS = {
  projectRoot: 'C:\\Users\\RUNNER~1\\work\\ogham',
  pluginRoot:
    'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\filid-review-plugin-58v2km',
};

/** Directory holding the copy the current case restored into. */
let directory: string;
/** The preserved state, restored under the Windows roots. */
let restored: ReviewStateRecord;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'filid-root-spelling-'));
  const statePath = join(directory, 'review-state.json');
  copyPreservedTreeWithRoots(PRESERVED_STATE, statePath, WINDOWS_ROOTS);
  const state = readReviewState(statePath);
  if (!state || 'kind' in state)
    throw new Error('the restored state is not a readable v2 state');
  restored = state;
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('a review fixture root spelled with backslashes', () => {
  it('reaches a restored JSON artifact as the root it stands for', () => {
    expect(restored.projectRoot).toBe(WINDOWS_ROOTS.projectRoot);
    expect(restored.incremental?.pluginRoot).toBe(WINDOWS_ROOTS.pluginRoot);
  });

  it('leaves no trace in a normalized state', () => {
    const text = normalizeReviewStateText(restored, [
      WINDOWS_ROOTS.projectRoot,
      WINDOWS_ROOTS.pluginRoot,
    ]);
    expect(text).toContain('<ROOT0>');
    expect(text).toContain('<ROOT1>');
    expect(text).not.toContain('RUNNER~1');
  });
});
