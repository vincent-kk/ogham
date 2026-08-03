/** L3 서브레이어 이름 집합 — 서브레이어를 갖는 레이어는 L3 뿐이다. */
export const L3_SUB_LAYERS = new Set(['relational', 'structural', 'topical']);

export const SYMMETRIC_RELATIONSHIPS = [
  'friend',
  'family',
  'colleague',
  'acquaintance',
] as const;

export const AUTO_GENERATED_FM_KEYS = [
  'created',
  'updated',
  'tags',
  'layer',
  'sub_layer',
  'title',
  'source',
  'expires',
  'mentioned_persons',
] as const;
