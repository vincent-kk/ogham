export const FULL_REBUILD_THRESHOLD = 0.1;

export const MAX_CROSS_LAYER_EDGES_PER_NODE = 50;

/** kg_status include_orphan_paths 응답의 경로 목록 상한 (정렬 후 절단; 01_Core 가 사전순 선두라 고신호 우선 보존) */
export const MAX_LINK_ORPHAN_PATHS = 200;

/** kg_navigate siblings 응답 기본 상한 — 대형 자동수집 폴더의 이웃 폭주로부터 도구 응답을 보호 (include_all_siblings 로 해제) */
export const MAX_NAVIGATE_SIBLINGS = 50;

/** kg_navigate 이웃 목록(inbound/outbound/children/crossLayer/domain) 상한 — 허브 노드의 전체 KnowledgeNode 배열 폭주로부터 응답을 보호. 절단 시 neighborTotals 로 원총수를 보고한다 */
export const MAX_NAVIGATE_NEIGHBORS = 50;

/** activity_read 응답의 총 엔트리 상한 — 활동 로그는 매 호출 append 되므로 무상한 조회는 LLM 컨텍스트를 범람시킨다. 최신 우선으로 자르고 truncated 로 신호한다 */
export const MAX_ACTIVITY_READ_ENTRIES = 200;

/** kg_build 응답의 parseFailures 목록 상한 — 광범위 손상 시 파일당 한 항목이 무상한으로 쏟아지는 것을 막는다. 절단 시 parseFailuresTotal 로 총수를 보고한다 */
export const MAX_KG_BUILD_PARSE_FAILURES = 50;

/** delete 거부 응답의 backlink 경고 나열 상한 — 초과분은 요약 한 줄로 대체한다 */
export const MAX_DELETE_BACKLINK_WARNINGS = 20;

/** kg_search cluster 열거 모드의 절대 반환 캡 — max_results 가 페이지 크기를 정하되 이 값을 넘지 못한다. 절단 시 truncated 로 신호하고 clusterSize 로 창 내 총원을 보고한다 */
export const MAX_CLUSTER_ENUMERATION = 200;

/** kg_search cluster 열거 모드의 max_results 미지정 기본 페이지 — 서고 병합 후 수백 건 클러스터가 일상이라 LLM 응답 예산을 보호한다. 이어 읽기는 until 창 이동 */
export const CLUSTER_ENUMERATION_DEFAULT_PAGE = 50;

/** kg_search 시드 접촉 클러스터 자동 확장(R10)의 항목 상한 — 초과분은 expansionOmitted 로 보고한다 */
export const CLUSTER_EXPANSION_CAP = 10;

/** 한 응답에서 확장되는 클러스터 수 상한 — 광범위 시드의 토큰 폭발 방어선. 초과 클러스터는 collapsedMembers 경로로 내려간다 */
export const MAX_EXPANDED_CLUSTERS = 5;

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
