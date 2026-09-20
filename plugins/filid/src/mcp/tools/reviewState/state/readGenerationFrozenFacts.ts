import { existsSync, readdirSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';
import type { NormalizedFileFacts } from '../../../../types/fractal.js';

import { readFrozenFacts } from './readFrozenFacts.js';
import { readReviewState } from './readReviewState.js';
import { resolveGenerationDirectory } from './resolveGenerationDirectory.js';

/** The state a generation keeps of itself, written when it was published. */
const GENERATION_STATE_FILE = 'generation-state.json';

/**
 * The facts one review generation froze, found by its id alone.
 *
 * The caller that needs this — `facts compare`, checking a candidate against
 * what a review was judged on (spec §9) — knows the generation and not the
 * branch, so the branch directories are searched for one that holds it. Each
 * generation keeps its own `facts.json` and its own state snapshot, so a
 * generation still on disk answers from its own freeze even after its branch
 * has moved on to a later one.
 *
 * The digest comes from that snapshot and is checked by `readFrozenFacts`, so
 * a `facts.json` somebody edited reads as absent rather than as evidence.
 *
 * The branch key is a normalized name plus a hash, so the directory name is
 * used as it stands: normalizing it a second time would name a different
 * directory.
 *
 * @param projectRoot - Absolute project root holding `.filid/review`.
 * @param generationId - The generation whose frozen facts are wanted.
 * @returns Those facts, or null when no generation on disk holds usable ones.
 */
export function readGenerationFrozenFacts(
  projectRoot: string,
  generationId: string,
): NormalizedFileFacts[] | null {
  const reviewRoot = resolveContainedPath(
    projectRoot,
    REVIEW_STATE_DIRECTORY_NAMES.FILID,
    REVIEW_STATE_DIRECTORY_NAMES.REVIEW,
  );
  let branches: string[];
  try {
    branches = readdirSync(reviewRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return null;
  }
  for (const branch of branches) {
    const directory = resolveGenerationDirectory(
      resolveContainedPath(reviewRoot, branch),
      generationId,
    );
    if (!existsSync(directory)) continue;
    assertNoSymlinkDescendantsSync(projectRoot, directory);
    const state = readReviewState(
      resolveContainedPath(directory, GENERATION_STATE_FILE),
    );
    if (state === null || 'kind' in state) return null;
    const frozen = readFrozenFacts(
      resolveContainedPath(directory, REVIEW_STATE_FILE_NAMES.FACTS),
      state,
    );
    return frozen.status === 'ok' ? frozen.facts : null;
  }
  return null;
}
