import type { SubLayer } from '../types/common.js';

/**
 * L3 서브레이어 디렉토리 prefix → SubLayer 매핑. document-parser 가 경로 기반 추론에 사용.
 * L5 는 서브레이어가 없으므로 `05_Context/` 경로에서 추론할 것이 없다.
 */
export const SUBLAYER_DIR_PATTERNS: Record<string, SubLayer> = {
  '03_External/relational': 'relational',
  '03_External/structural': 'structural',
  '03_External/topical': 'topical',
};
