/**
 * @file companionIdentity.ts
 * @description Companion identity 정본 주입 예산 상수.
 *
 * 예산은 저작(setup·companion_edit) 게이트로 강제된다 — 런타임 컷은 없다.
 * 렌더러·편집도구·마이그레이션이 companionBudget util을 통해 공유한다.
 */

/**
 * 매 턴 주입(`inject ∈ {turn, both}`) 섹션 렌더 문자열 총합의 하드리밋.
 * 초과 시 저작 시점에 저장을 거부하고 session 강등 또는 brief 압축을 유도한다.
 */
export const TURN_IDENTITY_CHAR_BUDGET = 1024;

/**
 * 세션시작 주입(`inject ∈ {session, both}`) 렌더 총합의 안전판(soft).
 * 런타임 컷 기준이 아니며, 저작 도구가 초과를 경고하는 임계치로만 사용한다.
 */
export const SESSION_IDENTITY_CHAR_BUDGET = 8192;
