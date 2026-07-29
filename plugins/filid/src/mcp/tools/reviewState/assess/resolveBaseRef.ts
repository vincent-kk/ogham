import {
  REVIEW_BASE_REF_CANDIDATES,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';

/**
 * Resolve the base ref, trying candidates in the documented order: an explicit
 * ref, the remote HEAD default branch, then the conventional names.
 *
 * Each candidate is verified before it is returned, so an unresolvable base is
 * reported as null rather than guessed at.
 * @param projectRoot Repository the refs are resolved in.
 * @param explicitBaseRef Caller-supplied ref, tried first when present.
 * @returns The first ref that exists, or null when none does.
 */
export async function resolveBaseRef(
  projectRoot: string,
  explicitBaseRef?: string,
): Promise<string | null> {
  const remoteHead = await tryGit(
    projectRoot,
    REVIEW_STATE_GIT_ARGUMENTS.REMOTE_HEAD,
  );
  const candidates = [
    ...(explicitBaseRef ? [explicitBaseRef] : []),
    ...(remoteHead ? [remoteHead.trim()] : []),
    ...REVIEW_BASE_REF_CANDIDATES,
  ];
  for (const candidate of candidates) {
    const verified = await tryGit(projectRoot, [
      ...REVIEW_STATE_GIT_ARGUMENTS.VERIFY_REF,
      candidate,
    ]);
    if (verified !== null) return candidate;
  }
  return null;
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
