/**
 * @file sessionSweep.ts
 * @description 세션 sweep 상수 — 미마감 레코드 무활동 판정 임계.
 * touch 재개방(오마감 자가치유)이 있어 공격적 임계가 안전하다.
 */
export const STALE_SESSION_THRESHOLD_MS = 30 * 60 * 1000;

/** sweep 이 마감 후보를 찾는 일자 창 (당일 포함 최근 파일 수) */
export const SESSION_SWEEP_DAY_WINDOW = 3;
