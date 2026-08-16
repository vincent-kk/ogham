export const INTENT_MD_LINE_LIMIT = 50;

export const BOUNDARY_KEYWORDS = {
  alwaysDo: /^###?\s*(always\s*do)/im,
  askFirst: /^###?\s*(ask\s*first)/im,
  neverDo: /^###?\s*(never\s*do)/im,
} as const;

/**
 * Backtick code-span token shaped like a path: whitespace-free with at least
 * one `/` separator. Ecosystem file extensions are deliberately not consulted
 * — core stays language-neutral; `src/adapters/` owns ecosystem literals.
 */
export const PATH_TOKEN_PATTERN = /`([^`\s]*\/[^`\s]*)`/g;

/** Path tokens in one section at or above this count are an enumeration. */
export const DERIVABLE_ENUMERATION_THRESHOLD = 3;
