import type { LoadedReviewRule } from '../../rules/reviewRuleTypes.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewScopeFile } from '../../state/reviewStateTypes.js';

/** Inputs used by the post-group verification-rule augmentation. */
interface ApplyMissingTestRulesInput {
  /** Complete changed-file roster carrying initial rule selections. */
  files: readonly ReviewScopeFile[];
  /** Creation-ordered groups used to inspect verification co-location. */
  groups: readonly ReviewGroup[];
  /** Active rules whose bodies can be rendered into briefs. */
  activeRules: readonly LoadedReviewRule[];
}

/**
 * Add the tests rule to source files whose group has no verification change.
 * @param input Prepared files, groups, and active rule definitions.
 * @returns A new roster with the post-group rule augmentation applied once.
 */
export function applyMissingTestRules(
  input: ApplyMissingTestRulesInput,
): ReviewScopeFile[] {
  if (!input.activeRules.some(({ id }) => id === 'tests'))
    return input.files.map((file) => ({ ...file }));
  const ruleOrder = new Map(
    input.activeRules.map(({ id }, index) => [id, index]),
  );
  const filesByPath = new Map(input.files.map((file) => [file.path, file]));
  const paths = new Set<string>();
  for (const group of input.groups) {
    const hasVerification = group.units.some(
      ({ path }) => filesByPath.get(path)?.role === 'verification',
    );
    if (hasVerification) continue;
    for (const unit of group.units)
      if (filesByPath.get(unit.path)?.role === 'source') paths.add(unit.path);
  }
  return input.files.map((file) => {
    const rules =
      paths.has(file.path) && !file.rules.includes('tests')
        ? [...file.rules, 'tests']
        : [...file.rules];
    rules.sort(
      (left, right) =>
        (ruleOrder.get(left) ?? ruleOrder.size) -
        (ruleOrder.get(right) ?? ruleOrder.size),
    );
    return {
      ...file,
      rules,
      repositoryRules: [...file.repositoryRules],
    };
  });
}
