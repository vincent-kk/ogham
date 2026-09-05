import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import { checkReviewOpinion } from '../../../opinion/checkReviewOpinion.js';
import { mergeReviewRounds } from '../../../opinion/mergeReviewRounds.js';
import { parseReviewOpinion } from '../../../opinion/parseReviewOpinion.js';
import type { ReviewOpinion } from '../../../opinion/reviewOpinionTypes.js';
import { resolveReviewArtifactPath } from '../../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../../state/reviewGroupTypes.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
  ReviewValidationProblem,
} from '../../../state/reviewStateTypes.js';
import { locateReviewFindings } from '../locateReviewFindings.js';

/** Inputs needed to reconstruct the canonical opinion before one reviewer round. */
interface RebuildPriorReviewOpinionInput {
  /** Absolute project root used to resolve finding locations. */
  projectRoot: string;
  /** Canonical review artifact paths for the prepared session. */
  paths: ReviewStatePaths;
  /** Prepared state whose source identity binds every raw opinion. */
  state: ReviewStateRecord;
  /** Group whose earlier reviewer rounds must be reconstructed. */
  group: ReviewGroup;
  /** Current round, which is excluded from the reconstruction. */
  round: number;
}

/**
 * Rebuild the canonical opinion through every raw round before the current one.
 *
 * @param input - Prepared review context and the current reviewer round.
 * @returns Canonical merged opinion for earlier rounds, or null at round one.
 * @throws When an earlier round is absent or no longer satisfies its contract.
 */
export async function rebuildPriorReviewOpinion(
  input: RebuildPriorReviewOpinionInput,
): Promise<ReviewOpinion | null> {
  let prior: ReviewOpinion | null = null;
  for (let priorRound = 1; priorRound < input.round; priorRound += 1) {
    const priorPath = resolveReviewArtifactPath(
      input.paths,
      `opinions/review-${input.group.id}.r${String(priorRound)}.json`,
    );
    const priorBytes = readUtf8FileIfExistsSync(priorPath);
    if (priorBytes === null)
      throw new Error(
        `review round is out of order for group ${input.group.id}`,
      );
    const parsed = parseReviewOpinion(priorBytes);
    if (parsed.opinion === null)
      throw new Error(
        `validated review opinion is invalid for ${input.group.id}`,
      );
    const problems: ReviewValidationProblem[] = [];
    if (
      !checkReviewOpinion(
        parsed.opinion,
        {
          group: input.group.id,
          round: priorRound,
          sourceHash: input.state.sourceHash,
          units: input.group.units,
        },
        problems,
      )
    )
      throw new Error(
        `validated review opinion is invalid for ${input.group.id}`,
      );
    const checkedOpinion = parsed.opinion;
    const locatedOpinion: ReviewOpinion = {
      ...checkedOpinion,
      findings: await locateReviewFindings(
        input.projectRoot,
        checkedOpinion.findings,
        input.group.units,
      ),
    };
    prior = mergeReviewRounds(prior, locatedOpinion).opinion;
  }
  return prior;
}
