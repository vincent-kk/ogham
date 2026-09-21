import { containsPathToken } from '../../../../../core/index.js';

/** Characters an ecosystem puts before a specifier's first path segment. */
const ALIAS_PREFIXES = ['@', '#', '~'];

/**
 * Whether a specifier spells a target's name as one of its path segments.
 *
 * A specifier is not file text: nothing quotes it, so its first segment starts
 * the string rather than following a separator — `'thing'` and `'auth/thing'`
 * name `thing` as surely as `'./thing.js'` does. `containsPathToken` answers
 * for text, where a leading occurrence has no opener to check; giving it a
 * leading separator here asks it the specifier's question with its own rules,
 * so the two cannot drift apart.
 *
 * An alias prefix is dropped rather than added to the opener set, which the
 * text reading shares. A package scope (`'@scope/pkg'`) is then read as the
 * segment `scope`: over-reporting keeps a diagnostic a reviewer can dismiss,
 * where under-reporting hides one the change caused.
 *
 * @param specifier - The reference as the provider reported it.
 * @param name - A relevance name, as `collectTargetNames` reports it.
 * @returns True when some segment of the specifier is that name.
 */
export function specifierNamesTarget(specifier: string, name: string): boolean {
  const withoutAlias = ALIAS_PREFIXES.some((prefix) =>
    specifier.startsWith(prefix),
  )
    ? specifier.slice(1)
    : specifier;
  return containsPathToken(`/${withoutAlias}`, name);
}
