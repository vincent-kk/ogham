import { stripPathExtension } from './stripPathExtension.js';

/**
 * Give `candidate` the extension notation the consumer already used. The
 * consumer's own specifier is the only evidence of what this ecosystem accepts,
 * so core restores that notation instead of deciding which extension is valid.
 */
export function applySpecifierExtension(
  candidate: string,
  rawSpecifier: string,
): string {
  const stem = stripPathExtension(rawSpecifier);
  return stripPathExtension(candidate) + rawSpecifier.slice(stem.length);
}
