import { pathForCompare } from '@ogham/cross-platform';

import { toProjectRelativePath } from '../../../../../lib/toProjectRelativePath.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

import type { ReviewScopePaths } from './selectReviewScopePaths.js';
import { specifierNamesTarget } from './specifierNamesTarget.js';

/** What decides whether a diagnostic belongs to this review. */
export interface OutOfScopeVerificationInput {
  /** The snapshot diagnostic being judged. */
  diagnostic: ToolDiagnostic;
  /** Absolute project root the diagnostic's path is made relative to. */
  projectRoot: string;
  /** The review's changed files and their graph neighbours. */
  scopePaths: ReviewScopePaths;
  /** Whether a project-relative path is one of the project's verification files. */
  isVerificationFile: (relativePath: string) => boolean;
  /** Relevance names of the changed files, as `collectTargetNames` reports them. */
  changedNames: readonly string[];
}

/**
 * Whether a diagnostic belongs to a verification file this review did not touch.
 *
 * A test file that imports something no longer there makes the dependency axis
 * indeterminate for the whole project. Carried into a review of unrelated
 * files, that turns every review of the repository inconclusive over a file
 * nobody in this change is responsible for — the review cannot fix it and
 * cannot approve past it.
 *
 * The exception is the case that would otherwise be hidden: when the reference
 * the file cannot resolve spells a changed file's name, the change under review
 * is what broke it, and the diagnostic stays. The name test is the relevance
 * filter's own rule, so a reference that never spells the name slips through
 * here exactly as it does there.
 *
 * @param input - The diagnostic, the review scope and the verification set.
 * @returns True when the diagnostic is about an untouched verification file and
 * names nothing this review changed.
 */
export function isOutOfScopeVerificationDiagnostic(
  input: OutOfScopeVerificationInput,
): boolean {
  const { diagnostic, scopePaths } = input;
  if (!diagnostic.path) return false;
  const relative = toProjectRelativePath(input.projectRoot, diagnostic.path);
  const key = pathForCompare(relative);
  if (
    [...scopePaths.changed, ...scopePaths.neighbours].some(
      (path) => pathForCompare(path) === key,
    )
  )
    return false;
  if (!input.isVerificationFile(relative)) return false;
  return !input.changedNames.some((name) =>
    specifierNamesTarget(diagnostic.specifier ?? '', name),
  );
}
