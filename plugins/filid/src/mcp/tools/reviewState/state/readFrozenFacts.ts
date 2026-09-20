import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import type { NormalizedFileFacts } from '../../../../types/fractal.js';
import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';

import { FrozenFactsSchema } from './frozenFactsSchema.js';

import type { ReviewStateRecord } from './reviewStateTypes.js';

/**
 * What a generation's `facts.json` turned out to be.
 *
 * `none` and `unusable` are deliberately different answers. A generation that
 * never froze anything owes no comparison; one whose digest says it froze
 * something that is no longer there owes a refusal, because skipping the
 * comparison on a file somebody edited is exactly the check being removed by
 * the thing it is meant to catch.
 */
export type FrozenFactsRead =
  | { status: 'none' }
  | { status: 'ok'; facts: NormalizedFileFacts[] }
  | { status: 'unusable'; reason: 'missing' | 'unreadable' | 'digest' };

/**
 * Read the facts a generation froze, judged against the digest it recorded.
 *
 * `none` is the answer for a generation prepared before facts were frozen: no
 * digest, nothing to compare against, and the checks that would compare do not
 * apply (spec §9). With a digest, the file must be there and must still hash
 * to it — the digest is the only thing that says a freeze happened, so a file
 * that disagrees with it is not this generation's freeze.
 *
 * @param factsPath - Absolute path of the generation's `facts.json`.
 * @param state - The generation's persisted state.
 * @returns Which of the three cases holds, with the facts when they are usable.
 */
export function readFrozenFacts(
  factsPath: string,
  state: ReviewStateRecord,
): FrozenFactsRead {
  const digest = state.scope.factsDigest;
  if (digest === undefined) return { status: 'none' };
  const text = readUtf8FileIfExistsSync(factsPath);
  if (text === null) return { status: 'unusable', reason: 'missing' };
  if (computeReviewArtifactHash(text) !== digest)
    return { status: 'unusable', reason: 'digest' };
  try {
    const parsed = FrozenFactsSchema.safeParse(JSON.parse(text));
    return parsed.success
      ? { status: 'ok', facts: parsed.data }
      : { status: 'unusable', reason: 'unreadable' };
  } catch {
    return { status: 'unusable', reason: 'unreadable' };
  }
}
