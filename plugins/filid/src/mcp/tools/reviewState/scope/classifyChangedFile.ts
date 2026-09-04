import { portableDirname, portableResolve } from '@ogham/cross-platform';

import { resolveOwningFractal } from '../../../../core/index.js';
import type {
  ClassifyChangedFileOptions,
  ReviewChangedFile,
  ReviewScopeFile,
} from '../state/reviewStateTypes.js';

import { resolveChangedFileRole } from './utils/resolveChangedFileRole.js';
import { toProjectRelativePath } from './utils/toProjectRelativePath.js';

/**
 * Enrich one committed roster entry with deterministic role and owner facts.
 * @param entry Git-derived changed path and churn.
 * @param options Generated paths, snapshot tree, root, and injected role lookup.
 * @returns Roster entry with review role and project-relative owner.
 */
export function classifyChangedFile(
  entry: ReviewChangedFile,
  options: ClassifyChangedFileOptions,
): ReviewScopeFile {
  const absolutePath = portableResolve(options.projectRoot, entry.path);
  const ownerTarget =
    entry.change === 'D' ? portableDirname(absolutePath) : absolutePath;
  const owner = resolveOwningFractal(options.tree, ownerTarget);
  return {
    ...entry,
    role: resolveChangedFileRole(entry, absolutePath, options),
    owner: owner
      ? toProjectRelativePath(options.projectRoot, owner.path)
      : null,
  };
}
