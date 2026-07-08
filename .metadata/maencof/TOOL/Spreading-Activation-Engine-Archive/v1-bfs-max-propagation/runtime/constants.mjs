/**
 * v1 동결 상수 — plugins/maencof HEAD(2026-07-08, 4dab2f39) 스냅샷의 .mjs 이식.
 * 정본은 ../source/constants/*.ts (verbatim). 값 변경 금지.
 */

export const EDGE_TYPE_MULTIPLIER = {
  LINK: 1.0,
  PARENT_OF: 0.8,
  CHILD_OF: 0.8,
  SIBLING: 0.5,
  RELATIONSHIP: 0.7,
  CROSS_LAYER: 0.6,
  DOMAIN: 0.3,
};

export const SIBLING_FANOUT_CAP = 8;

export const LAYER_DECAY_FACTORS = {
  1: 0.5,
  2: 0.7,
  3: 0.8,
  4: 0.9,
  5: 0.95,
};

export const SUBLAYER_DECAY_FACTORS = {
  relational: 0.75,
  structural: 0.8,
  topical: 0.85,
  buffer: 0.95,
  boundary: 0.6,
};

export const PHRASE_CONTIGUITY_BONUS = 0.15;
export const PATH_PREFIX_SEED_CAP = 25;
export const PATH_PREFIX_MATCH_SCORE = 0.5;
export const KEYWORD_SEED_CAP = 30;

export const WORD_BOUNDARY_SPLIT_REGEX = /[\s\-_/\\.,;:!?()[\]{}'"]+/;
