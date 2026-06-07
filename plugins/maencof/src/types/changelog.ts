/**
 * @file changelog.ts
 * @description Changelog 타입 정의 — 자기 변경(self-changes) 추적 및 일별 기록
 *
 * 02_Derived/changelog/ 디렉토리에 일별 파일로 관리되며,
 * maencof Layer 2 (Derived) 문서로 분류된다.
 */

/** Changelog 카테고리 */
export type ChangelogCategory =
  | 'knowledge' // 지식 변경 — 문서 생성/수정
  | 'structure' // 구조 변경 — 디렉토리/메모리 구조 변경
  | 'automation' // 자동화 — hook/스크립트 변경
  | 'learning' // 학습 — 새로 알게 된 패턴
  | 'preference'; // 사용자 선호 확인 — 확인된 사용자 선호사항

export {
  CHANGELOG_CATEGORY_LABELS,
  CHANGELOG_CATEGORY_ORDER,
} from '../constants/changelog.js';

/** 단일 changelog 엔트리 */
export interface ChangelogEntry {
  /** 카테고리 */
  category: ChangelogCategory;
  /** 변경 설명 */
  description: string;
  /** 관련 파일 경로 목록 (선택) */
  paths?: string[];
}

export {
  WATCHED_PATHS,
  CHANGELOG_EXCLUDE,
  CHANGELOG_DIR,
} from '../constants/changelog.js';

export { CHANGELOG_GATE_MARKER } from '../constants/markers.js';
