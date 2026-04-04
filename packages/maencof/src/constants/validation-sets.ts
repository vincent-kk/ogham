export const L3_SUB_LAYERS = new Set(['relational', 'structural', 'topical']);

export const L5_SUB_LAYERS = new Set(['buffer', 'boundary']);

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
