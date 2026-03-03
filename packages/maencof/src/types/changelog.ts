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

/** 카테고리 → 한국어 헤더 매핑 */
export const CHANGELOG_CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  knowledge: '지식 변경',
  structure: '구조 변경',
  automation: '자동화',
  learning: '학습',
  preference: '사용자 선호 확인',
};

/** 카테고리 표시 순서 */
export const CHANGELOG_CATEGORY_ORDER: ChangelogCategory[] = [
  'knowledge',
  'structure',
  'automation',
  'learning',
  'preference',
];

/** 단일 changelog 엔트리 */
export interface ChangelogEntry {
  /** 카테고리 */
  category: ChangelogCategory;
  /** 변경 설명 */
  description: string;
  /** 관련 파일 경로 목록 (선택) */
  paths?: string[];
}

/**
 * 감시 대상 경로 패턴.
 * git status --porcelain 결과와 매칭할 때 사용한다.
 *
 * - 01_Core/ — 핵심 정체성 문서
 * - 02_Derived/ — 파생 지식 (changelog/ 자체는 제외)
 * - .claude/agents/ — AI 에이전트 설정
 * - .claude/rules/ — AI 행동 규칙
 * - CLAUDE.md — 프로젝트 지시사항
 */
export const WATCHED_PATHS = [
  '01_Core/',
  '02_Derived/',
  '.claude/agents/',
  '.claude/rules/',
  'CLAUDE.md',
] as const;

/** changelog 자체 경로 (감시 제외) */
export const CHANGELOG_EXCLUDE = '02_Derived/changelog/';

/** changelog 마커 파일 (gate 통과 확인용) */
export const CHANGELOG_GATE_MARKER = '.changelog-gate-passed';

/** changelog 저장 디렉토리 (vault 기준 상대 경로) */
export const CHANGELOG_DIR = '02_Derived/changelog';
