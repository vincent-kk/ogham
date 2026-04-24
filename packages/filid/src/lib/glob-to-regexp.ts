/**
 * @file glob-to-regexp.ts
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
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}
