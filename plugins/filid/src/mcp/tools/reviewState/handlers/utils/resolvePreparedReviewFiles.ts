import { findRepositoryRulePaths } from '../../rules/findRepositoryRulePaths.js';
import { resolveFileRules } from '../../rules/resolveFileRules.js';
import type {
  LoadedReviewRule,
  ReviewRuleDefinition,
} from '../../rules/reviewRuleTypes.js';
import type { ReviewScopeFile } from '../../state/reviewStateTypes.js';

/** Inputs used to attach applicable review and repository instructions. */
interface ResolvePreparedReviewFilesInput {
  /** Absolute repository root bounding instruction discovery. */
  projectRoot: string;
  /** Complete changed-file roster from scope evidence. */
  files: readonly ReviewScopeFile[];
  /** Validated built-in rules in canonical declaration order. */
  rules: readonly LoadedReviewRule[];
  /** Validated repository overrides in declaration order. */
  overrides: readonly LoadedReviewRule[];
}

/**
 * Attach selected rule identifiers and repository instruction paths to files.
 * @param input Scope roster and validated rule declarations.
 * @returns A new roster preserving skipped entries without review instructions.
 */
export function resolvePreparedReviewFiles(
  input: ResolvePreparedReviewFilesInput,
): ReviewScopeFile[] {
  return input.files.map((file) => {
    if (file.skipReason !== null) return { ...file };
    return {
      ...file,
      rules: resolveFileRules({
        file,
        rules: input.rules as readonly ReviewRuleDefinition[],
        overrides: input.overrides as readonly ReviewRuleDefinition[],
      }),
      repositoryRules: findRepositoryRulePaths(input.projectRoot, file.path),
    };
  });
}
