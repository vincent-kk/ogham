export const FULL_REBUILD_THRESHOLD = 0.1;

export const MAX_CROSS_LAYER_EDGES_PER_NODE = 50;

/** kg_status include_orphan_paths 응답의 경로 목록 상한 (정렬 후 절단; 01_Core 가 사전순 선두라 고신호 우선 보존) */
export const MAX_LINK_ORPHAN_PATHS = 200;

export const STALE_THRESHOLD_PERCENT = 10;

/**
 * 누적 stale 엔트리가 본 임계치에 도달하면 mutate-side-effects 가 background rebuild 를
 * fire-and-forget 으로 트리거한다. mutate 빈도 vs rebuild 비용의 균형을 통제하는 정책 상수.
 *
 * read-time 1회 처리 상한은 READ_REINDEX_CAP — 의미가 다르므로 동일 값이라도 별도 관리한다.
 * STALE_THRESHOLD_PERCENT(advisory 비율 임계치) 와도 단위가 다르므로 혼동 금지.
 */
export const STALE_REBUILD_THRESHOLD = 5;

/**
 * read-path freshness-guard 가 1회 호출에서 처리하는 stale entry 상한 (가장 최근 항목 우선).
 * 초과분은 background rebuild 가 흡수한다. read latency 의 worst-case 를 통제하는 정책 상수.
 *
 * STALE_REBUILD_THRESHOLD 와 의미가 다르며, drift 회피를 위해 항상 별도 import 한다.
 */
export const READ_REINDEX_CAP = 15;
