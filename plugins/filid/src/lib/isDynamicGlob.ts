/**
 * @file isDynamicGlob.ts
 * @description Does a pattern carry glob magic, or is it a literal path?
 *
 * The magic set is exactly what {@link glob-to-regexp} expands: `**`, `*`
 * and `?`. Every other character — braces, brackets, parentheses — is escaped
 * to a literal there, so a pattern built only from those matches one string
 * and is reported static. Callers use the answer to skip regex construction
 * and compare paths directly.
 *
 * Never throws: a non-string or empty pattern is static.
 */
const GLOB_MAGIC = /[*?]/;

export function isDynamicGlob(pattern: string): boolean {
  return typeof pattern === 'string' && GLOB_MAGIC.test(pattern);
}
