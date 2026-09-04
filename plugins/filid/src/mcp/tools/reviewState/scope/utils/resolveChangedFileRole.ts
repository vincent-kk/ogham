import { portableBasename } from '@ogham/cross-platform';

import { matchesGeneratedPath } from '../../assess/matchesGeneratedPath.js';
import type {
  ClassifyChangedFileOptions,
  ReviewChangedFile,
  ReviewScopeRole,
} from '../../state/reviewStateTypes.js';

/**
 * Assign the first matching generated, document, verification, or source role.
 * @param entry Git-derived changed path and status.
 * @param absolutePath Absolute path passed to verification classification.
 * @param options Generated-path patterns and injected verification classifier.
 * @returns Review rule-selection role for the changed path.
 */
export function resolveChangedFileRole(
  entry: ReviewChangedFile,
  absolutePath: string,
  options: ClassifyChangedFileOptions,
): ReviewScopeRole {
  if (
    options.generatedPaths.some((path) =>
      matchesGeneratedPath(path, entry.path),
    )
  )
    return 'generated';
  const basename = portableBasename(entry.path);
  if (basename === 'INTENT.md' || basename === 'DETAIL.md') return 'document';
  if (basename.toLowerCase().endsWith('.md')) return 'document';
  if (entry.change === 'D') return 'source';
  return options.classifyVerification(absolutePath) === 'unsupported'
    ? 'source'
    : 'verification';
}
