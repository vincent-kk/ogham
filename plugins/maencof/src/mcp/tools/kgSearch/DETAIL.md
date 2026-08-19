# kgSearch — Contract

## Requirements

- `kg_search` 는 시드(경로 또는 키워드)에서 Spreading Activation 으로 관련 문서를 찾아 **참조 메타**를 돌려준다. 쿼리 엔진(`search/queryEngine`)의 `ActivationResult` 는 불변이고, 노드 메타 매핑은 이 핸들러의 몫이다.
- 기본 응답 항목은 `{ path, score, hops, title, tags, gist? }` 다. hop 체인은 `include_trace: true` 일 때만 `trace` 로, 본문 전문은 `include_content: true` 일 때만 `content` 로 싣는다 — 응답은 LLM 컨텍스트로 들어가므로 기본형은 가볍게 유지한다.
- seed 해석 상태는 응답 `seedResolution` 이 항상 보고한다 — `resolved` 는 seed 원문→어휘 매칭 노드 수(시드 budget 캡 이전), `unresolved` 는 어떤 노드에도 매칭되지 않은 원문(입력 순서·중복 제거, 미해석 존재 시에만 키 존재). `results` 는 해석된 seed 만 반영하며 내용·점수·순서는 불변이다.
- `include_content` 의 본문 읽기는 `vaultRoot` 파라미터로 위임받아 `core/vaultScanner` 의 `readVaultFile` 로 수행한다. 파일 부재·읽기 실패 문서는 오류 대신 `content` 를 생략한다.
- `sub_layer`·`layer_filter`·`since`/`until` 은 전부 쿼리 엔진 옵션으로 전달한다 — `sub_layer` 는 `subLayerFilter` pre-filter 다(핸들러 post-filter 금지: 절단 후 필터는 `max_results` 미달을 만든다).
- collapse 표기: 쿼리 엔진이 접은 결과의 `clusterKey`/`collapsedCount` 를 항목에 그대로 노출한다. collapse 의미론의 정본은 `search/queryEngine/DETAIL.md` 다.
- **cluster 열거 모드**: `cluster` 입력이 있으면 SA 없이 해당 `clusterKey` 전역 멤버를 `updated` 내림차순(동률 시 path 사전순)으로 반환한다. `seed` 와 상호 배타(둘 다/둘 다 없음 → `{ error }`). `MAX_CLUSTER_ENUMERATION`(200) 절단 시 `truncated: true`. `max_results`·`layer_filter`·`sub_layer`·`since`/`until`·`include_trace` 는 이 모드에 적용되지 않는다. 항목 score/hops 는 0, `exploredNodes` 는 0, `seedResolution` 은 `{ resolved: {} }`, 응답에 `cluster`·`clusterSize`(전역 총원) 를 싣는다. `include_content` 는 두 모드 공용이다.
- `graph` 가 null 이면 재색인 안내를 담은 `{ error }` 를 돌려준다.

## API Contracts

- `handleKgSearch(graph: KnowledgeGraph | null, input: KgSearchInput, vaultRoot?: string): Promise<KgSearchResult | { error: string }>`
- `KgSearchInput` — `seed` 또는 `cluster` 중 정확히 하나(상호 배타) · `max_results`(기본 10) · `decay`(0.7) · `threshold`(0.1) · `max_hops`(5) · `since`/`until` · `layer_filter` · `sub_layer` · `include_trace`(기본 false) · `include_content`(기본 false).
- `KgSearchResult` — `results: KgSearchResultItem[]`(점수 내림차순; 항목 optional `clusterKey`/`collapsedCount`) · `durationMs` · `exploredNodes` · `seedResolution`(항상) · cluster 모드 한정 `cluster`/`clusterSize`/`truncated?`. 항목·`SeedResolution` 형태의 정본은 `types/mcpKg.ts`.

## Acceptance Criteria

### AC-reference-meta-default — 기본 참조 메타

- 옵션 없는 호출의 결과 항목은 `path`·`title`·`tags`(·`gist`)를 담고 `trace`·`content`·`nodeId` 키를 갖지 않는다.

### AC-trace-optional — hop 체인 옵션화

- `include_trace: true` 일 때만 시드→노드 경로가 `trace` 로 실린다.

### AC-content-optional — 본문 옵션화

- `include_content: true` 이고 vault 에 파일이 있으면 `content` 에 원문 전문이 실리고, 파일이 없는 노드는 `content` 없이 반환된다.

### AC-seed-resolution-always — seed 해석 상시 가시화

- 전부/일부/전무 해석의 3-상태가 응답만으로 구분된다: 전부 해석이면 `seedResolution.resolved` 만(`unresolved` 키 부재), 일부 실패면 생존 seed 계수 + 미해석 원문 목록, 전무면 빈 `resolved` + 전체 `unresolved`(이때 `exploredNodes` 는 0). 동일 인자 재호출(캐시 적중)에도 유지된다.

### AC-cluster-open — 클러스터 열거 모드

- `cluster` 입력은 해당 `clusterKey` 전역 멤버를 `updated` 내림차순으로 반환하고, `seed` 와 함께 오거나 둘 다 없으면 `{ error }` 를 돌려준다. 응답은 `clusterSize` 로 전역 총원을 보고한다.

### AC-collapse-marking — 접힘 표기

- 같은 `clusterKey` 문서 여럿이 활성화된 검색 응답에는 그 클러스터의 항목이 1건만 나타나고, 그 항목이 `clusterKey` 와 `collapsedCount` 를 담는다.

## History

- 2026-08-20 — cluster 열거 모드와 collapse 표기를 추가하고 `seed` 를 optional 로 완화했다 (R4). `sub_layer` post-filter 는 쿼리 엔진 `subLayerFilter` 로 이동 — 절단 후 필터의 `max_results` 미달 결함이 함께 해소됐다.
- 2026-08-05 — 참조 메타 기본 응답과 trace/content 옵션 계약을 문서화했다 (cross-review FIX-011).

## Last Updated

2026-08-20 — cluster 열거 모드·collapse 표기 계약을 추가했다 (R4).
