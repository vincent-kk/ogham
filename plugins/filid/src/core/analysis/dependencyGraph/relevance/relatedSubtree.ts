import { portableDirname } from '@ogham/cross-platform';

import type { RelevanceTarget } from './relevanceTarget.js';

/**
 * The path whose subtree is related to a target whatever the file text says.
 * @param target Unit under judgement.
 * @returns The directory for a directory or module index, the file itself otherwise.
 */
export function relatedSubtree(target: RelevanceTarget): string {
  return target.kind === 'module-index'
    ? portableDirname(target.path)
    : target.path;
}
