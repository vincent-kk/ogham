export const INTENT_MD_LINE_LIMIT = 50;

export const BOUNDARY_KEYWORDS = {
  alwaysDo: /^###?\s*(always\s*do)/im,
  askFirst: /^###?\s*(ask\s*first)/im,
  neverDo: /^###?\s*(never\s*do)/im,
} as const;
