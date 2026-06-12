export const INTENT_MD_LINE_LIMIT = 50;

export const CRITERIA_REQUIRED_FIELDS = [
  'claim',
  'observable',
  'expected',
  'scope',
  'status',
] as const;

export const CRITERIA_STATUS_VALUES = [
  'active',
  'superseded',
  'retired',
] as const;

export const BOUNDARY_KEYWORDS = {
  alwaysDo: /^###?\s*(always\s*do)/im,
  askFirst: /^###?\s*(ask\s*first)/im,
  neverDo: /^###?\s*(never\s*do)/im,
} as const;
