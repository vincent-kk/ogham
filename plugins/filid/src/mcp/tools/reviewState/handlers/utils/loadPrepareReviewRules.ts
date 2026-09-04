import { loadRepositoryRules } from '../../rules/loadRepositoryRules.js';
import { loadRuleMap } from '../../rules/loadRuleMap.js';

import { resolveActiveReviewRules } from './resolveActiveReviewRules.js';

/**
 * Load prepare rule sources while preserving stable diagnostic code prefixes.
 * @param projectRoot Absolute repository root bounding override rule files.
 * @param pluginRoot Resolved plugin root containing the built-in rule map.
 * @returns Built-in, override, and replacement-resolved active rule lists.
 */
export function loadPrepareReviewRules(
  projectRoot: string,
  pluginRoot: string | null,
) {
  const rules = loadRuleMap(pluginRoot);
  const overrides = loadRepositoryRules(projectRoot);
  return {
    rules,
    overrides,
    activeRules: resolveActiveReviewRules(rules, overrides),
  };
}
