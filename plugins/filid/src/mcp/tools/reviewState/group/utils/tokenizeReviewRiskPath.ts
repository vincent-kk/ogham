/** Boundary between an uppercase acronym and the following capitalized word. */
const ACRONYM_WORD_BOUNDARY_PATTERN = /([A-Z]+)([A-Z][a-z])/g;

/** Boundary from a lowercase letter or digit to the next camel-case word. */
const CAMEL_CASE_WORD_BOUNDARY_PATTERN = /([a-z0-9])([A-Z])/g;

/** Separators between lowercase ASCII path words, retaining digits in each word. */
const PATH_WORD_SEPARATOR_PATTERN = /[^a-z0-9]+/;

/**
 * Split a review path into the complete words used by risk keyword matching.
 * @param path Project-relative file path whose case and punctuation mark boundaries.
 * @returns Lowercase ASCII words, preserving digits and empty boundary tokens.
 */
export function tokenizeReviewRiskPath(path: string): string[] {
  return path
    .replace(ACRONYM_WORD_BOUNDARY_PATTERN, '$1/$2')
    .replace(CAMEL_CASE_WORD_BOUNDARY_PATTERN, '$1/$2')
    .toLowerCase()
    .split(PATH_WORD_SEPARATOR_PATTERN);
}
