import type { VerificationRole } from '../../../../types/adapters.js';
import { matchesGeneratedPath } from '../assess/matchesGeneratedPath.js';
import type {
  ReviewChangedFile,
  ReviewScopeRole,
} from '../state/reviewStateTypes.js';

import { isLockfilePath } from './isLockfilePath.js';

/** Dependencies needed to classify a changed path without ambient state. */
interface ResolveChangedFileRoleOptions {
  /** Configured generated-path patterns, in declaration order. */
  generatedPaths: readonly string[];
  /** Effective lockfile basenames, replacing defaults when configured. */
  lockfiles: readonly string[];
  /** Adapter classification applied only after cheaper role checks. */
  classifyVerification: (filePath: string) => VerificationRole | 'unsupported';
}

/**
 * Resolve the first applicable review role for one committed changed path.
 * @param entry Git-derived change, churn, and binary facts.
 * @param absolutePath Absolute path passed to the verification adapter.
 * @param options Generated, lockfile, and verification classifiers.
 * @returns The role selected by the v7 precedence contract.
 */
export function resolveChangedFileRole(
  entry: ReviewChangedFile,
  absolutePath: string,
  options: ResolveChangedFileRoleOptions,
): ReviewScopeRole {
  if (
    options.generatedPaths.some((pattern) =>
      matchesGeneratedPath(pattern, entry.path),
    )
  )
    return 'generated';
  if (entry.change === 'D') return 'source';
  if (entry.binary) return 'binary';
  if (isLockfilePath(entry.path, options.lockfiles)) return 'lockfile';
  if (entry.path.toLowerCase().endsWith('.md')) return 'document';
  return options.classifyVerification(absolutePath) === 'unsupported'
    ? 'source'
    : 'verification';
}
