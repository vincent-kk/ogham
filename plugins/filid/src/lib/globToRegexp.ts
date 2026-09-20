/** Regex syntax that a glob treats as literal text. */
const REGEXP_METACHARACTER_PATTERN = /[.+^${}()|[\]\\]/g;

/** A recursive wildcard and its separator, at the start or after a separator. */
const ANY_SEGMENTS_PATTERN = /(^|\/)\*\*\//g;

/** Recursive wildcard protected before single-star conversion. */
const DOUBLE_STAR_PATTERN = /\*\*/g;

/** That protected form, restored after the single-star conversion. */
const ANY_SEGMENTS_PLACEHOLDER_PATTERN = /__ANYSEGMENTS__/g;

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
 *   a recursive wildcard followed by a separator — zero or more path segments
 *   `**` elsewhere — any path (including separators and newlines)
 *   `*`  — any single path segment (no `/`)
 *   `?`  — any single character within a segment (no `/`)
 *   All other characters are matched literally (regex metacharacters escaped).
 *
 * The recursive wildcard spans ZERO segments as well as many, which is what
 * every glob implementation a user has met does: a recursive wildcard, a
 * separator and `*.ts` matches the root's own `index.ts`, not only
 * `src/index.ts`. A separator compiled literally would put every root-level
 * file outside such a scope — silently, because a file outside a scope is
 * reported `unsupported` rather than missing. A trailing recursive wildcard
 * matches everything beneath its directory.
 *
 * `**` compiles to `[\s\S]*`, not `.*`: a regular `.` excludes newlines, so a
 * file whose name contains one would fall outside every `**` pattern while
 * still matching `*` (which compiles to a negated class and does match one),
 * putting the same file in scope under one pattern and out under another.
 * Both forms match every character a filename may hold.
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
    .replace(ANY_SEGMENTS_PATTERN, '$1__ANYSEGMENTS__')
    .replace(DOUBLE_STAR_PATTERN, '__DOUBLESTAR__')
    .replace(SINGLE_STAR_PATTERN, '[^/]*')
    .replace(QUESTION_MARK_PATTERN, '[^/]')
    .replace(ANY_SEGMENTS_PLACEHOLDER_PATTERN, '(?:[\\s\\S]*/)?')
    .replace(DOUBLE_STAR_PLACEHOLDER_PATTERN, '[\\s\\S]*');
  return new RegExp(`^${escaped}$`);
}
