import type {
  ChangedScopeViolationSelection,
  ReviewScopeFile,
  ReviewScopeViolation,
} from '../state/reviewStateTypes.js';

import { compareScopeViolations } from './utils/compareScopeViolations.js';

function intersectsFile(
  violation: ReviewScopeViolation,
  file: ReviewScopeFile,
): boolean {
  const isAncestor = file.path.startsWith(`${violation.path}/`);
  return (
    violation.path === file.path || isAncestor || violation.path === file.owner
  );
}

/**
 * Split normalized violations by intersection with changed files and owners.
 * @param violations Project-wide structure and verification violations.
 * @param files Changed-file roster with project-relative owners.
 * @returns Retained changed-scope violations in input order, and out-of-scope
 *   observations sorted by path, rule and message.
 */
export function selectChangedScopeViolations(
  violations: readonly ReviewScopeViolation[],
  files: readonly ReviewScopeFile[],
): ChangedScopeViolationSelection {
  const retained: ReviewScopeViolation[] = [];
  const outOfScope: ReviewScopeViolation[] = [];
  for (const violation of violations)
    (files.some((file) => intersectsFile(violation, file))
      ? retained
      : outOfScope
    ).push(violation);
  return { retained, outOfScope: outOfScope.sort(compareScopeViolations) };
}
