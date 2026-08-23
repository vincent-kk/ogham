import {
  type CodexMoveProvenance,
  projectApplyPatchHunks,
} from '@ogham/cross-platform';

import { readFileForEdit } from './readFileForEdit.js';

/** Result of reading and projecting one normalized Codex Move source. */
export type MoveProjectionResult =
  | {
      /** The complete destination content is known. */
      kind: 'exact';
      /** Complete projected destination content. */
      content: string;
    }
  | {
      /** The source path could not be read. */
      kind: 'missing-source';
    }
  | {
      /** The current source does not contain one hunk before-image. */
      kind: 'stale-source';
      /** Zero-based index of the absent hunk. */
      hunkIndex: number;
    }
  | {
      /** One hunk before-image has multiple candidate locations. */
      kind: 'ambiguous';
      /** Zero-based index of the ambiguous hunk. */
      hunkIndex: number;
    };

/**
 * Read and conservatively project a normalized Codex Move destination.
 *
 * @param move - Move path and delta provenance from the shared normalizer
 * @param safeCwd - Validated project root used for source resolution
 * @returns Exact content or a distinct missing, stale, or ambiguous result
 */
export function projectMoveContent(
  move: CodexMoveProvenance,
  safeCwd: string,
): MoveProjectionResult {
  const current = readFileForEdit(move.sourcePath, safeCwd);
  if (current === undefined) return { kind: 'missing-source' };
  if (move.hunks.length === 0) return { kind: 'exact', content: current };
  return projectApplyPatchHunks(current, move.hunks);
}
