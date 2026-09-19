import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

import type { LoadedReviewRule } from './reviewRuleTypes.js';
import { isRepositoryReviewRuleDefinition } from './utils/isRepositoryReviewRuleDefinition.js';

const REPOSITORY_RULES_NEXT_ACTION =
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.REPOSITORY_RULES_INVALID;

/** Build the shared repository-rules-invalid diagnostic error for one message. */
function repositoryRulesInvalid(message: string): ToolDiagnosticError {
  return new ToolDiagnosticError(
    REVIEW_STATE_DIAGNOSTIC_CODES.REPOSITORY_RULES_INVALID,
    message,
    REPOSITORY_RULES_NEXT_ACTION,
  );
}

/**
 * Load optional repository review overrides and their contained Markdown bodies.
 * @param projectRoot Absolute repository root that bounds every override path.
 * @returns Validated overrides in repository declaration order.
 */
export function loadRepositoryRules(projectRoot: string): LoadedReviewRule[] {
  let configPath: string;
  try {
    configPath = resolveContainedPath(
      projectRoot,
      REVIEW_STATE_FILE_NAMES.REPOSITORY_RULES,
    );
    assertNoSymlinkDescendantsSync(projectRoot, configPath);
  } catch (error) {
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.RULE_PATH_ESCAPE,
      `Repository review rule map .filid/review-rules.json resolves outside ${projectRoot} or through a symlink.`,
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.RULE_PATH_ESCAPE,
      { cause: error },
    );
  }
  const raw = readUtf8FileIfExistsSync(configPath);
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (parseError) {
    throw repositoryRulesInvalid(
      `Repository review rules at ${configPath} are not valid JSON: ${
        parseError instanceof Error ? parseError.message : String(parseError)
      }.`,
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw repositoryRulesInvalid(
      `Repository review rules at ${configPath} must be a JSON object.`,
    );
  const config = parsed as Record<string, unknown>;
  if (
    Object.keys(config).some((key) => key !== 'rules') ||
    !Array.isArray(config.rules)
  )
    throw repositoryRulesInvalid(
      `Repository review rules at ${configPath} must contain only a "rules" array.`,
    );
  const ids = new Set<string>();
  return config.rules.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw repositoryRulesInvalid(
        `Repository review rule ${index} in ${configPath} must be an object.`,
      );
    const rule = value as Record<string, unknown>;
    if (
      Object.keys(rule).some(
        (key) => !['id', 'always', 'match', 'file', 'replaces'].includes(key),
      )
    )
      throw repositoryRulesInvalid(
        `Repository review rule ${index} has an unsupported field; allowed fields are id, always, match, file, replaces.`,
      );
    if (
      typeof rule.id !== 'string' ||
      rule.id.trim() === '' ||
      typeof rule.file !== 'string' ||
      rule.file.trim() === ''
    )
      throw repositoryRulesInvalid(
        `Repository review rule ${index} needs non-empty "id" and "file" strings.`,
      );
    const selectorCount =
      Number(rule.always === true) +
      Number(Array.isArray(rule.match) && rule.match.length > 0);
    if (
      selectorCount !== 1 ||
      (rule.always !== undefined && rule.always !== true)
    )
      throw repositoryRulesInvalid(
        `Repository review rule "${rule.id}" must declare exactly one selector: "always": true or a non-empty "match" array.`,
      );
    if (
      rule.match !== undefined &&
      (!Array.isArray(rule.match) ||
        rule.match.some((item) => typeof item !== 'string' || item === ''))
    )
      throw repositoryRulesInvalid(
        `Repository review rule "${rule.id}" has an invalid "match": it must be an array of non-empty glob strings.`,
      );
    if (
      rule.replaces !== undefined &&
      (!Array.isArray(rule.replaces) ||
        rule.replaces.some((item) => typeof item !== 'string' || item === ''))
    )
      throw repositoryRulesInvalid(
        `Repository review rule "${rule.id}" has an invalid "replaces": it must be an array of non-empty built-in rule ids.`,
      );
    if (!isRepositoryReviewRuleDefinition(rule))
      throw repositoryRulesInvalid(
        `Repository review rule ${index} does not match the repository rule schema.`,
      );
    const definition = rule;
    if (ids.has(definition.id))
      throw repositoryRulesInvalid(
        `Repository review rules declare id "${definition.id}" more than once.`,
      );
    ids.add(definition.id);
    let bodyPath: string;
    try {
      bodyPath = resolveContainedPath(projectRoot, definition.file);
      assertNoSymlinkDescendantsSync(projectRoot, bodyPath);
    } catch (error) {
      throw new ToolDiagnosticError(
        REVIEW_STATE_DIAGNOSTIC_CODES.RULE_PATH_ESCAPE,
        `Repository review rule "${definition.id}" file "${definition.file}" resolves outside ${projectRoot} or through a symlink.`,
        `Ask the user to point rule "${definition.id}" in .filid/review-rules.json at a regular Markdown file inside the repository. Then call review_state prepare again.`,
        { cause: error },
      );
    }
    const body = readUtf8FileIfExistsSync(bodyPath);
    if (body === null)
      throw new ToolDiagnosticError(
        REVIEW_STATE_DIAGNOSTIC_CODES.REPOSITORY_RULE_BODY_MISSING,
        `Repository review rule "${definition.id}" body file ${bodyPath} does not exist.`,
        `Ask the user to create ${definition.file} or correct rule "${definition.id}"'s file in .filid/review-rules.json. Then call review_state prepare again.`,
      );
    return { ...definition, body };
  });
}
