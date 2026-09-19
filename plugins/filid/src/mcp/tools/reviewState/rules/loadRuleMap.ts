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
import { isBuiltinReviewRuleDefinition } from './utils/isBuiltinReviewRuleDefinition.js';

/** Supported built-in conditional selector values. */
const SUPPORTED_WHEN = new Set<string>([
  'role:verification',
  'role:document',
  'owner',
]);

const RULE_MAP_MISSING_NEXT_ACTION =
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.RULE_MAP_MISSING;
const RULE_MAP_INVALID_NEXT_ACTION =
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.RULE_MAP_INVALID;

/** Build the shared rule-map-invalid diagnostic error for one message. */
function ruleMapInvalid(mapPath: string, detail: string): ToolDiagnosticError {
  return new ToolDiagnosticError(
    REVIEW_STATE_DIAGNOSTIC_CODES.RULE_MAP_INVALID,
    `Installed cross-review rule map ${mapPath}: ${detail}`,
    RULE_MAP_INVALID_NEXT_ACTION,
  );
}

/**
 * Load and validate the canonical cross-review rule map and every rule body.
 * @param pluginRoot Resolved Filid plugin root, or null when unavailable.
 * @returns Rules and Markdown bodies in canonical declaration order.
 */
export function loadRuleMap(pluginRoot: string | null): LoadedReviewRule[] {
  if (pluginRoot === null)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.RULE_MAP_MISSING,
      'Cross-review rule map cannot be loaded because the filid plugin root is unavailable (CLAUDE_PLUGIN_ROOT is unset and no plugin root was found).',
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.PLUGIN_ROOT_UNAVAILABLE,
    );
  const rulesDirectory = resolveContainedPath(
    pluginRoot,
    'skills',
    'cross-review',
    'rules',
  );
  const mapPath = resolveContainedPath(
    rulesDirectory,
    REVIEW_STATE_FILE_NAMES.RULE_MAP,
  );
  assertNoSymlinkDescendantsSync(pluginRoot, mapPath);
  const raw = readUtf8FileIfExistsSync(mapPath);
  if (raw === null)
    throw new ToolDiagnosticError(
      REVIEW_STATE_DIAGNOSTIC_CODES.RULE_MAP_MISSING,
      `Cross-review rule map is missing: "${mapPath}".`,
      RULE_MAP_MISSING_NEXT_ACTION,
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ruleMapInvalid(mapPath, 'is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw ruleMapInvalid(mapPath, 'must be an object.');
  const map = parsed as Record<string, unknown>;
  if (
    Object.keys(map).some(
      (key) => !['schema_version', 'rules'].includes(key),
    ) ||
    map.schema_version !== 1 ||
    !Array.isArray(map.rules)
  )
    throw ruleMapInvalid(
      mapPath,
      'must use schema_version 1 and declare rules.',
    );
  const ids = new Set<string>();
  return map.rules.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw ruleMapInvalid(mapPath, `review rule ${index} must be an object.`);
    const rule = value as Record<string, unknown>;
    if (
      Object.keys(rule).some(
        (key) => !['id', 'always', 'match', 'when', 'file'].includes(key),
      )
    )
      throw ruleMapInvalid(
        mapPath,
        `review rule ${index} has an unsupported field.`,
      );
    if (
      typeof rule.id !== 'string' ||
      rule.id.trim() === '' ||
      typeof rule.file !== 'string' ||
      rule.file.trim() === ''
    )
      throw ruleMapInvalid(
        mapPath,
        `review rule ${index} requires non-empty id and file values.`,
      );
    const selectorCount =
      Number(rule.always === true) +
      Number(Array.isArray(rule.match) && rule.match.length > 0) +
      Number(typeof rule.when === 'string');
    if (
      selectorCount !== 1 ||
      (rule.always !== undefined && rule.always !== true)
    )
      throw ruleMapInvalid(
        mapPath,
        `review rule "${rule.id}" must declare exactly one supported selector.`,
      );
    if (
      rule.match !== undefined &&
      (!Array.isArray(rule.match) ||
        rule.match.some((item) => typeof item !== 'string' || item === ''))
    )
      throw ruleMapInvalid(
        mapPath,
        `review rule "${rule.id}" has an invalid match selector.`,
      );
    if (
      rule.when !== undefined &&
      (typeof rule.when !== 'string' || !SUPPORTED_WHEN.has(rule.when))
    )
      throw ruleMapInvalid(
        mapPath,
        `review rule "${rule.id}" has an invalid when selector.`,
      );
    if (!isBuiltinReviewRuleDefinition(rule))
      throw ruleMapInvalid(
        mapPath,
        `review rule ${index} has an invalid definition.`,
      );
    const definition = rule;
    if (ids.has(definition.id))
      throw ruleMapInvalid(
        mapPath,
        `cross-review rule map duplicates id "${definition.id}".`,
      );
    ids.add(definition.id);
    const bodyPath = resolveContainedPath(rulesDirectory, definition.file);
    assertNoSymlinkDescendantsSync(rulesDirectory, bodyPath);
    const body = readUtf8FileIfExistsSync(bodyPath);
    if (body === null)
      throw new ToolDiagnosticError(
        REVIEW_STATE_DIAGNOSTIC_CODES.RULE_MAP_MISSING,
        `Cross-review rule body "${bodyPath}" is missing for built-in rule "${definition.id}".`,
        RULE_MAP_MISSING_NEXT_ACTION,
      );
    return { ...definition, body };
  });
}
