import { REVIEW_STATE_GIT_ARGUMENTS } from '../../../../constants/reviewState.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';

/** `cat-file --batch-check` answers for names that resolve to no single object. */
const UNRESOLVED_ANSWER = /\s(missing|ambiguous)$/;

/**
 * Find which candidate names resolve to an object, in one Git process.
 *
 * Every candidate is handed to `git cat-file --batch-check`, which resolves
 * names exactly like `rev-parse --verify` and answers one line per input
 * line in order. When the answer count does not match, or a candidate is
 * empty or could not be sent on one line, each candidate is verified on its
 * own instead.
 *
 * @param projectRoot Repository the names are resolved in.
 * @param candidates Ref names or object names, in priority order.
 * @returns The candidates that resolve, as a set.
 */
export async function verifyReviewRefs(
  projectRoot: string,
  candidates: readonly string[],
): Promise<Set<string>> {
  if (candidates.length === 0) return new Set();
  const answers = candidates.some((candidate) => /^$|\s/.test(candidate))
    ? null
    : await readBatchAnswers(projectRoot, candidates);
  if (answers === null || answers.length !== candidates.length)
    return verifyEachRef(projectRoot, candidates);
  return new Set(
    candidates.filter((_, index) => !UNRESOLVED_ANSWER.test(answers[index])),
  );
}

async function readBatchAnswers(
  projectRoot: string,
  candidates: readonly string[],
): Promise<string[] | null> {
  try {
    const output = await executeReviewGit(
      projectRoot,
      ['cat-file', '--batch-check'],
      `${candidates.join('\n')}\n`,
    );
    return output.split('\n').filter((line) => line.length > 0);
  } catch {
    return null;
  }
}

async function verifyEachRef(
  projectRoot: string,
  candidates: readonly string[],
): Promise<Set<string>> {
  const resolved = new Set<string>();
  for (const candidate of candidates)
    try {
      await executeReviewGit(projectRoot, [
        ...REVIEW_STATE_GIT_ARGUMENTS.VERIFY_REF,
        candidate,
      ]);
      resolved.add(candidate);
    } catch {
      // an unresolvable candidate is simply absent from the result
    }
  return resolved;
}
