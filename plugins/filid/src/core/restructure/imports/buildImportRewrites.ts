import { pathForCompare, samePath } from '@ogham/cross-platform';

import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewriteBuildResult,
  PlannedMove,
  RewriteUnit,
} from '../../../types/restructure.js';

import { collectIncomingRewrites } from './collectIncomingRewrites.js';
import { collectOutgoingRewrites } from './collectOutgoingRewrites.js';
import { sortUniqueImports } from './sortUniqueImports.js';

/**
 * Derive the import edits a moved unit owns: rewrites filid writes, imports it
 * delegates to the caller, and imports the moves keep resolving.
 *
 * Imports never block a move. A unit that stays in place breaks no import and
 * owns none.
 * @param snapshot - Pre-move snapshot whose dependency evidence names every consumer
 * @param unit - Source, target and the path consumers load after the move
 * @param orderedMoves - Executable moves of the plan in execution order; when
 * empty the unit is taken to move alone
 * @returns Owned rewrites, delegated imports and preserved imports with final
 * consumer paths, each sorted by consumer and specifier without duplicates
 */
export function buildImportRewrites(
  snapshot: ProjectSnapshot,
  unit: RewriteUnit,
  orderedMoves: readonly PlannedMove[] = [],
): ImportRewriteBuildResult {
  if (samePath(unit.sourcePath, unit.targetPath))
    return { rewrites: [], delegated: [], preserved: [] };
  const moves = orderedMoves.length > 0 ? orderedMoves : [unit];
  const incoming = collectIncomingRewrites(snapshot, unit, moves);
  const outgoing = collectOutgoingRewrites(snapshot, unit, moves);
  return {
    rewrites: sortUniqueImports(
      [...incoming.rewrites, ...outgoing.rewrites],
      ({ requiredSpecifier }) => requiredSpecifier,
    ),
    delegated: sortUniqueImports(
      [...incoming.delegated, ...outgoing.delegated],
      ({ requiredResolvedPath }) => pathForCompare(requiredResolvedPath),
    ),
    preserved: sortUniqueImports(
      [...incoming.preserved, ...outgoing.preserved],
      ({ requiredResolvedPath }) => pathForCompare(requiredResolvedPath),
    ),
  };
}
