import { globToRegExp } from './globToRegexp.js';

/** Validate the minimal path glob grammar before compiling it. */
export function isValidPathPattern(pattern: string): boolean {
  if (!pattern) return false;
  let brackets = 0;
  let braces = 0;
  for (const character of pattern) {
    if (character === '[') brackets++;
    else if (character === ']') brackets--;
    else if (character === '{') braces++;
    else if (character === '}') braces--;
    if (brackets < 0 || braces < 0) return false;
  }
  if (brackets !== 0 || braces !== 0) return false;
  try {
    globToRegExp(pattern.replace(/\\/g, '/'));
    return true;
  } catch {
    return false;
  }
}

/** A project-relative pattern covers the matching path and its descendants. */
export function matchesPathPattern(pattern: string, relativePath: string): boolean {
  if (!isValidPathPattern(pattern)) return false;
  try {
    const normalized = pattern.replace(/\\/g, '/');
    const matcher = globToRegExp(normalized);
    const directoryMatcher = normalized.endsWith('/**')
      ? globToRegExp(normalized.slice(0, -3))
      : null;
    let path = relativePath.replace(/\\/g, '/');
    while (path) {
      if (matcher.test(path) || directoryMatcher?.test(path)) return true;
      const separator = path.lastIndexOf('/');
      if (separator < 0) break;
      path = path.slice(0, separator);
    }
  } catch {
    // Invalid patterns are reported by config loading and never match.
  }
  return false;
}

/** Return the first exclusion declaration that covers a path. */
export function matchingIgnoredPattern(
  config: { ignore?: readonly string[] } | null | undefined,
  relativePath: string,
): string | undefined {
  return config?.ignore?.find((pattern) =>
    matchesPathPattern(pattern, relativePath),
  );
}

export function isIgnoredPath(
  config: { ignore?: readonly string[] } | null | undefined,
  relativePath: string,
): boolean {
  return matchingIgnoredPattern(config, relativePath) !== undefined;
}
