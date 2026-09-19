/** Characters that may open a path segment: a separator, a quote, a backtick or a dot. */
const PATH_TOKEN_OPENERS = new Set(['/', "'", '"', '`', '.']);

/** An identifier character; the name continuing into one is a longer name, not this token. */
const IDENTIFIER_CHARACTER = /[A-Za-z0-9_$]/;

/**
 * Whether a name occurs in a text as a path token.
 *
 * The comparison ignores case. An occurrence counts when the character before
 * it opens a path segment and the character after it is not an identifier
 * character, or the text ends there. The text is searched, never parsed.
 * @param text File text to search.
 * @param name File stem or directory name.
 * @returns True when some occurrence of `name` is a path token; false for an
 *   empty name, which has no occurrence to judge.
 */
export function containsPathToken(text: string, name: string): boolean {
  if (name === '') return false;
  const haystack = text.toLowerCase();
  const needle = name.toLowerCase();
  for (
    let at = haystack.indexOf(needle, 1);
    at !== -1;
    at = haystack.indexOf(needle, at + 1)
  )
    if (
      PATH_TOKEN_OPENERS.has(haystack[at - 1]) &&
      !IDENTIFIER_CHARACTER.test(haystack[at + needle.length] ?? '')
    )
      return true;
  return false;
}
