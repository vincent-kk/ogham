import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { REVIEW_STATE_DIAGNOSTIC_CODES } from '../../../../constants/reviewState.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

import type { LoadedReviewRule } from './reviewRuleTypes.js';
import { isRepositoryReviewRuleDefinition } from './utils/isRepositoryReviewRuleDefinition.js';

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
      '.filid',
      'review-rules.json',
    );
    assertNoSymlinkDescendantsSync(projectRoot, configPath);
  } catch (error) {
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.RULE_PATH_ESCAPE,
      'Repository review rule map escapes the project root.',
      { cause: error },
    );
  }
  const raw = readUtf8FileIfExistsSync(configPath);
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Repository review rules contain invalid JSON: "${configPath}".`,
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Repository review rules must be an object.');
  const config = parsed as Record<string, unknown>;
  if (
    Object.keys(config).some((key) => key !== 'rules') ||
    !Array.isArray(config.rules)
  )
    throw new Error('Repository review rules must declare only a rules array.');
  const ids = new Set<string>();
  return config.rules.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`Repository review rule ${index} must be an object.`);
    const rule = value as Record<string, unknown>;
    if (
      Object.keys(rule).some(
        (key) => !['id', 'always', 'match', 'file', 'replaces'].includes(key),
      )
    )
      throw new Error(
        `Repository review rule ${index} has an unsupported field.`,
      );
    if (
      typeof rule.id !== 'string' ||
      rule.id.trim() === '' ||
      typeof rule.file !== 'string' ||
      rule.file.trim() === ''
    )
      throw new Error(
        `Repository review rule ${index} requires non-empty id and file values.`,
      );
    const selectorCount =
      Number(rule.always === true) +
      Number(Array.isArray(rule.match) && rule.match.length > 0);
    if (
      selectorCount !== 1 ||
      (rule.always !== undefined && rule.always !== true)
    )
      throw new Error(
        `Repository review rule "${rule.id}" must declare exactly one supported selector.`,
      );
    if (
      rule.match !== undefined &&
      (!Array.isArray(rule.match) ||
        rule.match.some((item) => typeof item !== 'string' || item === ''))
    )
      throw new Error(
        `Repository review rule "${rule.id}" has an invalid match selector.`,
      );
    if (
      rule.replaces !== undefined &&
      (!Array.isArray(rule.replaces) ||
        rule.replaces.some((item) => typeof item !== 'string' || item === ''))
    )
      throw new Error(
        `Repository review rule "${rule.id}" has invalid replacements.`,
      );
    if (!isRepositoryReviewRuleDefinition(rule))
      throw new Error(`Repository review rule ${index} is invalid.`);
    const definition = rule;
    if (ids.has(definition.id))
      throw new Error(
        `Repository review rules duplicate active id "${definition.id}".`,
      );
    ids.add(definition.id);
    let bodyPath: string;
    try {
      bodyPath = resolveContainedPath(projectRoot, definition.file);
      assertNoSymlinkDescendantsSync(projectRoot, bodyPath);
    } catch (error) {
      throw new ToolDiagnosticError(
        REVIEW_STATE_DIAGNOSTIC_CODES.RULE_PATH_ESCAPE,
        `Repository review rule "${definition.id}" file escapes the project root.`,
        { cause: error },
      );
    }
    const body = readUtf8FileIfExistsSync(bodyPath);
    if (body === null)
      throw new Error(
        `Repository review rule body is missing for "${definition.id}".`,
      );
    return { ...definition, body };
  });
}
