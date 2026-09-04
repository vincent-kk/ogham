import { portableDirname, portableResolve } from '@ogham/cross-platform';

import {
  REVIEW_LOCKFILE_BASENAMES,
  REVIEW_SKIP_REASONS,
} from '../../../../constants/reviewState.js';
import { resolveOwningFractal } from '../../../../core/index.js';
import { resolveChangedFileRole } from '../select/resolveChangedFileRole.js';
import type {
  ClassifyChangedFileOptions,
  ReviewChangedFile,
  ReviewScopeFile,
} from '../state/reviewStateTypes.js';

import { toProjectRelativePath } from './utils/toProjectRelativePath.js';

/**
 * Enrich one committed roster entry with deterministic role and owner facts.
 * @param entry Git-derived changed path and churn.
 * @param options Generated and lockfile settings, snapshot tree, root, and role lookup.
 * @returns Roster entry with review role and project-relative owner.
 */
export function classifyChangedFile(
  entry: ReviewChangedFile,
  options: ClassifyChangedFileOptions & {
    /** Effective lockfile basenames, with the canonical defaults as fallback. */
    lockfiles?: readonly string[];
  },
): ReviewScopeFile {
  const absolutePath = portableResolve(options.projectRoot, entry.path);
  const ownerTarget =
    entry.change === 'D' ? portableDirname(absolutePath) : absolutePath;
  const owner = resolveOwningFractal(options.tree, ownerTarget);
  const role = resolveChangedFileRole(entry, absolutePath, {
    generatedPaths: options.generatedPaths,
    lockfiles: options.lockfiles ?? REVIEW_LOCKFILE_BASENAMES,
    classifyVerification: options.classifyVerification,
  });
  const skipReason =
    role === 'generated'
      ? REVIEW_SKIP_REASONS.GENERATED
      : entry.change === 'D'
        ? REVIEW_SKIP_REASONS.DELETED
        : role === 'binary'
          ? REVIEW_SKIP_REASONS.BINARY
          : role === 'lockfile'
            ? REVIEW_SKIP_REASONS.LOCKFILE
            : null;
  return {
    ...entry,
    role,
    owner: owner
      ? toProjectRelativePath(options.projectRoot, owner.path)
      : null,
    skipReason,
    rules: [],
    repositoryRules: [],
  };
}
