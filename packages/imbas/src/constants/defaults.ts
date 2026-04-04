/**
 * @file constants/defaults.ts
 * @description 타임아웃, 결과 수, 기본값 등 런타임 기본 상수
 */

/** stdin 읽기 최대 대기 시간 (ms) */
export const STDIN_TIMEOUT_MS = 5000;

/** AST 검색 결과 최대 반환 수 */
export const AST_SEARCH_MAX_RESULTS = 100;

/** file_path가 지정되지 않을 때 사용하는 기본 파일 경로 */
export const DEFAULT_ANONYMOUS_PATH = 'anonymous.ts';
