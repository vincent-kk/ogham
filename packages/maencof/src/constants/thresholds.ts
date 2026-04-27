export const FULL_REBUILD_THRESHOLD = 0.1;

export const MAX_CROSS_LAYER_EDGES_PER_NODE = 50;

export const STALE_THRESHOLD_PERCENT = 10;

/**
 * Stale 노드 누적 개수의 절대 임계치.
 *
 * - mutate 후 누적 stale 개수가 이 값에 도달하면 background rebuild를 trigger한다.
 * - read 시 partial reindex 처리 권장 상한.
 *
 * 단위가 다른 `STALE_THRESHOLD_PERCENT`(advisory 비율 임계치)와 혼동 금지 — 본 상수는 절대 개수다.
 */
export const STALE_REBUILD_THRESHOLD = 15;
