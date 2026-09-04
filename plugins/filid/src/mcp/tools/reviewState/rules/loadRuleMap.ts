import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import type {
  LoadedReviewRule,
  ReviewRuleDefinition,
  ReviewRuleWhen,
} from './reviewRuleTypes.js';

/** Supported built-in conditional selector values. */
const SUPPORTED_WHEN = new Set<ReviewRuleWhen>([
  'role:verification',
  'role:document',
  'owner',
]);

/**
 * Load and validate the canonical cross-review rule map and every rule body.
 * @param pluginRoot Resolved Filid plugin root, or null when unavailable.
 * @returns Rules and Markdown bodies in canonical declaration order.
 */
export function loadRuleMap(pluginRoot: string | null): LoadedReviewRule[] {
  if (pluginRoot === null)
    throw new Error(
      'Cross-review rule map is missing: plugin root is unavailable.',
    );
  const rulesDirectory = resolveContainedPath(
    pluginRoot,
    'skills',
    'cross-review',
    'rules',
  );
  const mapPath = resolveContainedPath(rulesDirectory, 'rules.json');
  assertNoSymlinkDescendantsSync(pluginRoot, mapPath);
  const raw = readUtf8FileIfExistsSync(mapPath);
  if (raw === null)
    throw new Error(`Cross-review rule map is missing: "${mapPath}".`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Cross-review rule map is invalid JSON: "${mapPath}".`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Cross-review rule map must be an object.');
  const map = parsed as Record<string, unknown>;
  if (
    Object.keys(map).some(
      (key) => !['schema_version', 'rules'].includes(key),
    ) ||
    map.schema_version !== 1 ||
    !Array.isArray(map.rules)
  )
    throw new Error(
      'Cross-review rule map must use schema_version 1 and declare rules.',
    );
  const ids = new Set<string>();
  return map.rules.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`Review rule ${index} must be an object.`);
    const rule = value as Record<string, unknown>;
    if (
      Object.keys(rule).some(
        (key) => !['id', 'always', 'match', 'when', 'file'].includes(key),
      )
    )
      throw new Error(`Review rule ${index} has an unsupported field.`);
    if (
      typeof rule.id !== 'string' ||
      rule.id.trim() === '' ||
      typeof rule.file !== 'string' ||
      rule.file.trim() === ''
    )
      throw new Error(
        `Review rule ${index} requires non-empty id and file values.`,
      );
    const selectorCount =
      Number(rule.always === true) +
      Number(Array.isArray(rule.match) && rule.match.length > 0) +
      Number(typeof rule.when === 'string');
    if (
      selectorCount !== 1 ||
      (rule.always !== undefined && rule.always !== true)
    )
      throw new Error(
        `Review rule "${rule.id}" must declare exactly one supported selector.`,
      );
    if (
      rule.match !== undefined &&
      (!Array.isArray(rule.match) ||
        rule.match.some((item) => typeof item !== 'string' || item === ''))
    )
      throw new Error(
        `Review rule "${rule.id}" has an invalid match selector.`,
      );
    if (
      rule.when !== undefined &&
      (typeof rule.when !== 'string' ||
        !SUPPORTED_WHEN.has(rule.when as ReviewRuleWhen))
    )
      throw new Error(`Review rule "${rule.id}" has an invalid when selector.`);
    const definition = rule as unknown as ReviewRuleDefinition;
    if (ids.has(definition.id))
      throw new Error(
        `Cross-review rule map duplicates id "${definition.id}".`,
      );
    ids.add(definition.id);
    const bodyPath = resolveContainedPath(rulesDirectory, definition.file);
    assertNoSymlinkDescendantsSync(rulesDirectory, bodyPath);
    const body = readUtf8FileIfExistsSync(bodyPath);
    if (body === null)
      throw new Error(
        `Cross-review rule body is missing for "${definition.id}".`,
      );
    return { ...definition, body };
  });
}
