import type { CodexMoveProvenance } from '@ogham/cross-platform';

import { readFileForEdit } from './readFileForEdit.js';

/**
 * Read and conservatively project a normalized Codex Move destination.
 *
 * @param move - Move path and delta provenance from the shared normalizer
 * @param safeCwd - Validated project root used for source resolution
 * @returns Exact content when provable, otherwise undefined
 */
export function projectMoveContent(
  move: CodexMoveProvenance,
  safeCwd: string,
): string | undefined {
  if (move.addedLines.length > 0 || move.removedLines.length > 0)
    return undefined;
  const current = readFileForEdit(move.sourcePath, safeCwd);
  return current;
}
