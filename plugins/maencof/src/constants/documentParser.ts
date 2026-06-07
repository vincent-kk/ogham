import type { SubLayer } from '../types/common.js';

/** L3/L5 서브레이어 디렉토리 prefix → SubLayer 매핑. document-parser 가 경로 기반 추론에 사용. */
export const SUBLAYER_DIR_PATTERNS: Record<string, SubLayer> = {
  '03_External/relational': 'relational',
  '03_External/structural': 'structural',
  '03_External/topical': 'topical',
  '05_Context/buffer': 'buffer',
  '05_Context/boundary': 'boundary',
};
