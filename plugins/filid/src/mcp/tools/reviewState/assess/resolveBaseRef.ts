import {
  REVIEW_BASE_REF_CANDIDATES,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';

import { verifyReviewRefs } from './verifyReviewRefs.js';

/**
 * Resolve the base ref, trying candidates in the documented order: an explicit
 * ref, the remote HEAD default branch, then the conventional names.
 *
 * The explicit ref keeps `rev-parse --verify` semantics, which also accept a
 * full object name; the named candidates are verified in one Git process.
 * An unresolvable base is reported as null rather than guessed at.
 * @param projectRoot Repository the refs are resolved in.
 * @param explicitBaseRef Caller-supplied ref, tried first when present.
 * @returns The first ref that exists, or null when none does.
 */
export async function resolveBaseRef(
  projectRoot: string,
  explicitBaseRef?: string,
): Promise<string | null> {
  if (explicitBaseRef) {
    const verified = await tryGit(projectRoot, [
      ...REVIEW_STATE_GIT_ARGUMENTS.VERIFY_REF,
      explicitBaseRef,
    ]);
    if (verified !== null) return explicitBaseRef;
  }
  const remoteHead = await tryGit(
    projectRoot,
    REVIEW_STATE_GIT_ARGUMENTS.REMOTE_HEAD,
  );
  const candidates = [
    ...(remoteHead ? [remoteHead.trim()] : []),
    ...REVIEW_BASE_REF_CANDIDATES,
  ];
  const resolvable = await verifyReviewRefs(projectRoot, candidates);
  return candidates.find((candidate) => resolvable.has(candidate)) ?? null;
}

/** Run git, treating a non-zero exit as "no answer" rather than a failure. */
async function tryGit(
  projectRoot: string,
  args: readonly string[],
): Promise<string | null> {
  try {
    return await executeReviewGit(projectRoot, args);
  } catch {
    return null;
  }
}
