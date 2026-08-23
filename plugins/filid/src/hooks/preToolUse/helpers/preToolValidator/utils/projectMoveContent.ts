import type { CodexMoveProvenance } from '@ogham/cross-platform';

import { readFileForEdit } from './readFileForEdit.js';

/**
 * Read and conservatively project a normalized Codex Move destination.
 *
 * @param move - Lossless Move provenance from the shared normalizer
 * @param safeCwd - Validated project root used for source resolution
 * @returns Exact content when provable, otherwise undefined
 */
export function projectMoveContent(
  move: CodexMoveProvenance,
  safeCwd: string,
): string | undefined {
  if (move.sourceChangedEarlier) return undefined;
  const current = readFileForEdit(move.sourcePath, safeCwd);
  if (current === undefined) return undefined;
  if (move.addedLines.length === 0 && move.removedLines.length === 0)
    return current;
  const oldString = move.removedLines.join('\n');
  const first = current.indexOf(oldString);
  if (!oldString || first < 0 || current.indexOf(oldString, first + 1) >= 0)
    return undefined;
  return current.replace(oldString, () => move.addedLines.join('\n'));
}
