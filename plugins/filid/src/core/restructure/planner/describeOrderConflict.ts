import { pathForCompare } from '@ogham/cross-platform';

import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import type {
  OrderConflictCause,
  PlannedMove,
  RestructureDecision,
} from '../../../types/restructure.js';

/** The human-readable half of a decision. */
type Sentences = Pick<RestructureDecision, 'message' | 'nextAction'>;

/** Sentence builders per conflict cause; `related` lists the other sources involved, in request order. */
const CONFLICT_SENTENCES: Record<
  OrderConflictCause,
  (move: PlannedMove, related: string[]) => Sentences
> = {
  duplicate: ({ sourcePath }) => ({
    message: `${sourcePath} is requested more than once in this plan, so the moves cannot all run.`,
    nextAction: `Keep one request for ${sourcePath} and create a new plan.`,
  }),
  swap: ({ sourcePath }, related) => ({
    message: `Moves in this group (${[sourcePath, ...related].join(', ')}) land on paths other moves in the group still occupy, so no order runs them without overwriting a unit.`,
    nextAction:
      'Ask the user how to stage the exchange, for example by renaming one unit to a temporary name first; filid cannot plan a move onto an occupied path.',
  }),
  cycle: ({ sourcePath }, related) => ({
    message: `The moves of ${sourcePath} and ${related.join(', ')} each require another to run first, so no order runs them in one plan.`,
    nextAction: `Split them: plan and execute the move of ${findOuterSource([sourcePath, ...related])} alone, validate it, then create a new plan for the remaining requests against the new layout — a unit that already sits in place arrives in alreadyPlaced.`,
  }),
  nested: ({ sourcePath, targetPath }) => ({
    message: `${sourcePath} and its target ${targetPath} contain each other, so the move cannot run.`,
    nextAction: `If the target lies inside ${sourcePath}, its consumers are inside it too and it already encloses them: drop this request, or request the part that should move. If the target encloses ${sourcePath}, create a new plan with a different organNameHint.`,
  }),
  emptied: ({ sourcePath }, related) => ({
    message: `Every file filid sees under ${sourcePath} leaves through other moves in this plan (${related.join(', ')}), so the directory move itself would move an empty directory.`,
    nextAction: `Drop this request and create a new plan; the inner moves relocate the files filid sees. After executing it, look inside ${sourcePath}: filid does not see dot-prefixed files or directories, symbolic links, git-ignored files, or excluded directories (docs, scripts, build, dist, coverage, next, bridge, node_modules and structure.additionalExcludedDirectories). Ask the user where any leftovers belong, and delete ${sourcePath} only once it is empty.`,
  }),
};

/**
 * The first source of a cycle group in path order, so every member of the
 * group names the same move. A source that holds every other source is a path
 * prefix of each of them, so it always sorts first.
 * @param sources - Every source of the cycle group
 * @returns The source whose move the caller splits off first
 */
function findOuterSource(sources: string[]): string {
  return [...sources].sort((left, right) =>
    pathForCompare(left).localeCompare(pathForCompare(right)),
  )[0];
}

/**
 * Explain why no execution order can run a move.
 * @param move - The conflicting move's source and target
 * @param cause - Why the ordering step could not place it
 * @param relatedSources - Sources of the other moves involved, in request order; empty for `nested`
 * @returns The `move-order-conflict` decision naming the moves involved and the caller's next action
 */
export function describeOrderConflict(
  move: PlannedMove,
  cause: OrderConflictCause,
  relatedSources: string[],
): RestructureDecision {
  return {
    reason: RESTRUCTURE_DECISION_REASONS.MOVE_ORDER_CONFLICT,
    ...CONFLICT_SENTENCES[cause](move, relatedSources),
  };
}
