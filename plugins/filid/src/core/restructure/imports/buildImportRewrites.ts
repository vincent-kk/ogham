import { pathForCompare, samePath } from '@ogham/cross-platform';

import { RESTRUCTURE_PLAN_HASH_SEPARATOR } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewrite,
  ImportRewriteBuildResult,
  PlannedMove,
  RewriteUnit,
} from '../../../types/restructure.js';

import { collectIncomingRewrites } from './collectIncomingRewrites.js';
import { collectOutgoingRewrites } from './collectOutgoingRewrites.js';

/**
 * Derive the import edits a moved unit owns, and the reasons its imports
 * cannot be rewritten exactly.
 *
 * Both judgement sets — imports into the unit and imports out of it — are
 * checked independently of move order, ownership and consumer lists, so the
 * reasons are the same whichever moves share the plan. A unit that stays in
 * place breaks no import and is not judged.
 * @param snapshot - Pre-move snapshot whose dependency evidence names every consumer
 * @param unit - Source, target and the path consumers load after the move
 * @param orderedMoves - Executable moves of the plan in execution order; when
 * empty the unit is taken to move alone
 * @returns Owned rewrites with final consumer paths and specifiers, sorted by
 * consumer, plus decision reasons
 */
export function buildImportRewrites(
  snapshot: ProjectSnapshot,
  unit: RewriteUnit,
  orderedMoves: readonly PlannedMove[] = [],
): ImportRewriteBuildResult {
  if (samePath(unit.sourcePath, unit.targetPath))
    return { rewrites: [], decisionReasons: [] };
  const moves = orderedMoves.length > 0 ? orderedMoves : [unit];
  const incoming = collectIncomingRewrites(snapshot, unit, moves);
  const outgoing = collectOutgoingRewrites(snapshot, unit, moves);
  const rewrites = new Map<string, ImportRewrite>();
  for (const rewrite of [...incoming.rewrites, ...outgoing.rewrites])
    rewrites.set(
      [
        pathForCompare(rewrite.consumerPath),
        rewrite.currentSpecifier,
        rewrite.requiredSpecifier,
      ].join(RESTRUCTURE_PLAN_HASH_SEPARATOR),
      rewrite,
    );

  return {
    rewrites: [...rewrites.values()].sort(
      (left, right) =>
        pathForCompare(left.consumerPath).localeCompare(
          pathForCompare(right.consumerPath),
        ) || left.currentSpecifier.localeCompare(right.currentSpecifier),
    ),
    decisionReasons: [
      ...new Set([...incoming.decisionReasons, ...outgoing.decisionReasons]),
    ],
  };
}
