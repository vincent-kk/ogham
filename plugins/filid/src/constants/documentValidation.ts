export const INTENT_MD_LINE_LIMIT = 50;

export const BOUNDARY_KEYWORDS = {
  alwaysDo: /^###?\s*(always\s*do)/im,
  askFirst: /^###?\s*(ask\s*first)/im,
  neverDo: /^###?\s*(never\s*do)/im,
} as const;

/**
 * Backtick code-span token that names a file or directory: contains a path
 * separator or ends with a known source/document extension.
 */
export const PATH_TOKEN_PATTERN =
  /`([^`\n]*(?:\/[^`\n]*|\.(?:ts|tsx|js|jsx|mjs|cjs|md|json|css|html|yml|yaml)))`/g;

/** Path tokens in one section at or above this count are an enumeration. */
export const DERIVABLE_ENUMERATION_THRESHOLD = 3;
