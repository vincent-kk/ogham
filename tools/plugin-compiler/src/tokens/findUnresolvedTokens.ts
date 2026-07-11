/**
 * Reserved token namespace: `{{tool:…}}`, `{{skill:…}}`, `{{pluginRoot}}`, `{{var:…}}`.
 * Only these are compiler tokens — skill content may legitimately use other
 * `{{…}}` forms (e.g. dashboard/code template placeholders like `{{ComponentName}}`),
 * which must pass through untouched.
 */
const RESERVED = /\{\{\s*(?:tool|skill|pluginRoot|var)\b[^}]*\}\}/g;

/**
 * Find reserved compiler tokens left after substitution — a malformed or
 * unsupported token (e.g. `{{tool:}}`). A non-empty result fails the build
 * (`.metadata/plugin-compiler/ir-schema.md` §5). Non-reserved `{{…}}` is ignored.
 */
export function findUnresolvedTokens(text: string): string[] {
  return text.match(RESERVED) ?? [];
}
