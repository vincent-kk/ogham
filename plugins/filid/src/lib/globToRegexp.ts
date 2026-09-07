/** Regex syntax that a glob treats as literal text. */
const REGEXP_METACHARACTER_PATTERN = /[.+^${}()|[\]\\]/g;

/** Recursive wildcard protected before single-star conversion. */
const DOUBLE_STAR_PATTERN = /\*\*/g;

/** Single-segment wildcard after recursive wildcards have been protected. */
const SINGLE_STAR_PATTERN = /\*/g;

/** Protected recursive wildcard restored after single-star conversion. */
const DOUBLE_STAR_PLACEHOLDER_PATTERN = /__DOUBLESTAR__/g;

/** Single-character wildcard restricted to one path segment. */
const QUESTION_MARK_PATTERN = /\?/g;

/**
 * @file globToRegexp.ts
 * @description Convert a minimal picomatch-style glob into a `RegExp`.
 *
 * Supported syntax:
 *   `**` — any path (including separators)
 *   `*`  — any single path segment (no `/`)
 *   `?`  — any single character within a segment (no `/`)
 *   All other characters are matched literally (regex metacharacters escaped).
 *
 * Advanced globbing (brace sets, negation, character classes beyond
 * escape-safety) is NOT supported — the intended use cases are path-exempt
 * matching and config-time glob syntax validation.
 *
 * Invalid glob input surfaces as a `RegExp` construction `SyntaxError`; the
 * caller is responsible for catching and handling it. {@link is-exempt} and
 * {@link exempt-sanitize} both rely on this contract for AC10a/AC10b.
 */
export function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(REGEXP_METACHARACTER_PATTERN, '\\$&')
    .replace(DOUBLE_STAR_PATTERN, '__DOUBLESTAR__')
    .replace(SINGLE_STAR_PATTERN, '[^/]*')
    .replace(DOUBLE_STAR_PLACEHOLDER_PATTERN, '.*')
    .replace(QUESTION_MARK_PATTERN, '[^/]');
  return new RegExp(`^${escaped}$`);
}
