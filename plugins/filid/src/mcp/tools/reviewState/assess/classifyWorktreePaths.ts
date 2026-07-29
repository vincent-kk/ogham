import { portableBasename } from '@ogham/cross-platform/compat/basename';

import { DETAIL_MD, INTENT_MD } from '../../../../constants/documentFiles.js';
import { WORKTREE_DISPOSITIONS } from '../../../../constants/reviewState.js';
import type { WorktreeAssessment } from '../state/reviewStateTypes.js';

import { matchesGeneratedPath } from './matchesGeneratedPath.js';

/**
 * Group dirty paths into the classes merge-track decides on.
 *
 * The order is the contract: a module document is a document even when it sits
 * under a declared generated path, because Stage 1 is its committer either way.
 * @param dirtyPaths Repository-relative paths reported by `git status`.
 * @param generatedPaths Declared `structure.generatedPaths` patterns; an empty
 * list makes every non-document path source, which is the conservative default.
 * @returns The three groups and the disposition they add up to.
 */
export function classifyWorktreePaths(
  dirtyPaths: readonly string[],
  generatedPaths: readonly string[],
): WorktreeAssessment {
  const documents: string[] = [];
  const generated: string[] = [];
  const source: string[] = [];

  for (const dirtyPath of dirtyPaths) {
    const basename = portableBasename(dirtyPath);
    if (basename === INTENT_MD || basename === DETAIL_MD)
      documents.push(dirtyPath);
    else if (
      generatedPaths.some((pattern) => matchesGeneratedPath(pattern, dirtyPath))
    )
      generated.push(dirtyPath);
    else source.push(dirtyPath);
  }

  return {
    documents,
    generated,
    source,
    disposition: resolveDisposition(documents, generated, source),
  };
}

function resolveDisposition(
  documents: readonly string[],
  generated: readonly string[],
  source: readonly string[],
): WorktreeAssessment['disposition'] {
  if (source.length > 0) return WORKTREE_DISPOSITIONS.SOURCE_DIRTY;
  if (generated.length > 0) return WORKTREE_DISPOSITIONS.GENERATED_ONLY;
  if (documents.length > 0) return WORKTREE_DISPOSITIONS.DOCUMENTS_ONLY;
  return WORKTREE_DISPOSITIONS.CLEAN;
}
