import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
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
  let rules;
  try {
    rules = loadRuleMap(pluginRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = message.includes('missing')
      ? REVIEW_STATE_DIAGNOSTIC_CODES.RULE_MAP_MISSING
      : null;
    if (prefix !== null)
      throw new ToolDiagnosticError(prefix, message, { cause: error });
    throw new Error(message, { cause: error });
  }
  let overrides;
  try {
    overrides = loadRepositoryRules(projectRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = /escapes the project root|symbolic link/i.test(message)
      ? REVIEW_STATE_DIAGNOSTIC_CODES.RULE_PATH_ESCAPE
      : null;
    if (prefix !== null)
      throw new ToolDiagnosticError(prefix, message, { cause: error });
    throw new Error(message, { cause: error });
  }
  return {
    rules,
    overrides,
    activeRules: resolveActiveReviewRules(rules, overrides),
  };
}
