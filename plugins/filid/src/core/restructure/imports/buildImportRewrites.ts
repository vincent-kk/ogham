import { samePath } from '@ogham/cross-platform';

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
 * Derive the import requirements a moved unit owns — each with the file it must
 * load after every move and, when one can be synthesized, a suggested specifier —
 * and the imports the moves keep resolving.
 *
 * Imports never block a move. A unit that stays in place breaks no import and
 * owns none.
 * @param snapshot - Pre-move snapshot whose dependency evidence names every consumer
 * @param unit - Source, target and the path consumers load after the move
 * @param orderedMoves - Executable moves of the plan in execution order; when
 * empty the unit is taken to move alone
 * @returns Owned requirements and preserved imports with final consumer paths,
 * each sorted by consumer and specifier without duplicates
 */
export function buildImportRewrites(
  snapshot: ProjectSnapshot,
  unit: RewriteUnit,
  orderedMoves: readonly PlannedMove[] = [],
): ImportRewriteBuildResult {
  if (samePath(unit.sourcePath, unit.targetPath))
    return { required: [], preserved: [] };
  const moves = orderedMoves.length > 0 ? orderedMoves : [unit];
  const incoming = collectIncomingRewrites(snapshot, unit, moves);
  const outgoing = collectOutgoingRewrites(snapshot, unit, moves);
  return {
    required: sortUniqueImports([...incoming.required, ...outgoing.required]),
    preserved: sortUniqueImports([
      ...incoming.preserved,
      ...outgoing.preserved,
    ]),
  };
}
