# kgSearch — Contract

## Requirements

- `kg_search` 는 시드(경로 또는 키워드)에서 Spreading Activation 으로 관련 문서를 찾아 **참조 메타**를 돌려준다. 쿼리 엔진(`search/queryEngine`)의 `ActivationResult` 는 불변이고, 노드 메타 매핑은 이 핸들러의 몫이다.
- 기본 응답 항목은 `{ path, score, hops, title, tags, gist? }` 다. hop 체인은 `include_trace: true` 일 때만 `trace` 로, 본문 전문은 `include_content: true` 일 때만 `content` 로 싣는다 — 응답은 LLM 컨텍스트로 들어가므로 기본형은 가볍게 유지한다.
- seed 해석 상태는 응답 `seedResolution` 이 항상 보고한다 — `resolved` 는 seed 원문→어휘 매칭 노드 수(시드 budget 캡 이전), `unresolved` 는 어떤 노드에도 매칭되지 않은 원문(입력 순서·중복 제거, 미해석 존재 시에만 키 존재). `results` 는 해석된 seed 만 반영하며 내용·점수·순서는 불변이다.
- `include_content` 의 본문 읽기는 `vaultRoot` 파라미터로 위임받아 `core/vaultScanner` 의 `readVaultFile` 로 수행한다. 파일 부재·읽기 실패 문서는 오류 대신 `content` 를 생략한다.
- `sub_layer`·`layer_filter`·`since`/`until` 은 전부 쿼리 엔진 옵션으로 전달한다 — `sub_layer` 는 `subLayerFilter` pre-filter 다(핸들러 post-filter 금지: 절단 후 필터는 `max_results` 미달을 만든다).
- collapse 표기: 쿼리 엔진이 접은 결과의 `clusterKey`/`collapsedCount` 를 항목에 그대로 노출한다. collapse 의미론의 정본은 `search/queryEngine/DETAIL.md` 다.
- 접힌 멤버 목록 (R9): 접힌 항목은 쿼리 엔진이 산출한 `collapsedMembers`(접힌 활성 멤버, score 내림차순, 상한 5)를 path 문자열 목록으로 노출한다 — 단 그 항목에 `expansion` 이 있으면 생략한다(중복 토큰 차단).
- 시드 접촉 클러스터 자동 확장 (R10): 트리거는 `QueryResult.clusterMatches`(시드 어휘 매칭이 캡 이전에 닿은 클러스터) — 해당 접힌 항목에 `expansion` 을 싣는다. 목록은 **대표 자신을 제외한** 클러스터 전역 멤버를 매칭 멤버 우선 → `updated` 내림차순 → path 사전순으로 정렬해 상한 `CLUSTER_EXPANSION_CAP`(10)으로 자르고, 각 항목은 `{ path, title, updated, matched? }`, 초과분은 `expansionOmitted`(남은 수)로 보고한다. 전역 멤버가 대표뿐인 클러스터는 `expansion` 을 싣지 않는다. 한 응답에서 확장되는 클러스터는 결과 순위 상위 `MAX_EXPANDED_CLUSTERS`(5)개까지 — 초과 클러스터는 `collapsedMembers` 경로로 내려간다. `results` 의 순서·점수·구성은 두 필드와 무관하게 불변이다(랭킹 불변 — 평가 하네스 무영향). 멤버 수집은 touched 키 전체에 대한 `graph.nodes` 1패스다.
- **cluster 열거 모드**: `cluster` 입력이 있으면 SA 없이 해당 `clusterKey` 의 그래프 노드 전역 멤버와 `graph.archiveClusterMembers` 의 서고 멤버를 병합해 `updated` 내림차순(동률 시 path 사전순)으로 반환한다. 서고 항목은 `archived: true` 를 실어 구분한다 (`score`/`hops` 0 은 양쪽 공통). `seed` 와 상호 배타(둘 다/둘 다 없음 → `{ error }`). `since`/`until` 은 이 모드에서 병합 목록의 `updated` 시간창으로 적용된다. `match` 는 이 모드 전용 주제 필터다 — 병합 멤버의 `title`·`tags` 에 대소문자 무시 부분매칭을 노드·서고 멤버 **동일 규칙**으로 적용한다. 모든 필터(시간창·`match`)는 정렬·절단보다 먼저 한 단계에서 적용되며 절단은 페이지 상한 한 곳에서만 일어난다 — 절단이 필터보다 먼저 오면 정렬 하위의 오래된 매칭 항목이 조용히 유실된다. `clusterSize` 는 **필터 적용 후** 병합 총원이다. 반환 상한은 `max_results` 다 — 이 모드의 기본은 `CLUSTER_ENUMERATION_DEFAULT_PAGE`(50)이고 `MAX_CLUSTER_ENUMERATION`(200)이 절대 캡이다. 반환 수가 `clusterSize` 보다 적으면 `truncated: true`. 이어 읽기는 내림차순 정렬을 이용해 `until: <마지막 항목 updated>` 로 창을 옮긴다 — `updated` 가 일 단위라 같은 날짜 경계에서 중복될 수 있는 근사 커서다. `layer_filter`·`sub_layer`·`include_trace` 는 이 모드에 적용되지 않고, `match` 는 반대로 seed 모드에 적용되지 않는다. `graph.archiveClusterMembers` 미존재(구버전 캐시)면 서고 멤버 없이 기존과 동일하게 동작한다 — 다음 빌드가 채운다. `exploredNodes` 는 0, `seedResolution` 은 `{ resolved: {} }`, 응답에 `cluster`·`clusterSize` 를 싣는다. `include_content` 는 두 모드 공용이다.
- `graph` 가 null 이면 재색인 안내를 담은 `{ error }` 를 돌려준다.

## API Contracts

- `handleKgSearch(graph: KnowledgeGraph | null, input: KgSearchInput, vaultRoot?: string): Promise<KgSearchResult | { error: string }>`
- `KgSearchInput` — `seed` 또는 `cluster` 중 정확히 하나(상호 배타) · `match`(cluster 전용 — 멤버 `title`·`tags` 대소문자 무시 부분매칭) · `max_results`(seed 기본 10 · cluster 기본 50, 200 캡) · `decay`(0.7) · `threshold`(0.1) · `max_hops`(5) · `since`/`until` · `layer_filter` · `sub_layer` · `include_trace`(기본 false) · `include_content`(기본 false).
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

- `cluster` 입력은 해당 `clusterKey` 의 그래프 노드·서고 병합 멤버를 `updated` 내림차순으로 반환하고, `seed` 와 함께 오거나 둘 다 없으면 `{ error }` 를 돌려준다. 응답은 `clusterSize` 로 시간창 내 병합 총원을 보고한다. `graph.archiveClusterMembers` 미존재 그래프에서는 노드 멤버만으로 동일하게 동작한다.

### AC-cluster-archive-merged — 서고 멤버 병합

- `graph.archiveClusterMembers` 의 해당 키 멤버가 `archived: true` 를 싣고 노드 멤버와 함께 `updated` 내림차순으로 병합·정렬된다. 노드 항목에는 `archived` 가 실리지 않는다.

### AC-cluster-time-window — 시간창 적용

- `since`/`until` 이 병합 목록을 `updated` 시간창으로 거르고, `clusterSize` 는 창 내 총원을 보고한다.

### AC-cluster-page-limit — 페이지 상한

- cluster 모드의 반환 수는 `max_results` 가 정한다 — 미지정 시 `CLUSTER_ENUMERATION_DEFAULT_PAGE`(50), 어떤 값이든 `MAX_CLUSTER_ENUMERATION`(200)으로 캡. 반환 수가 `clusterSize` 보다 적으면 `truncated: true` 가 실린다.

### AC-cluster-match — 주제 필터와 절단 순서

- `match` 는 병합 멤버의 `title`·`tags` 대소문자 무시 부분매칭으로 거르고, `clusterSize` 는 매칭 통과 총원을 보고한다. 노드·서고 멤버에 같은 규칙이 적용된다.
- 필터는 절단보다 먼저 온다 — 정렬 하위(오래된 `updated`)의 매칭 항목도 `max_results` 절단에서 생존하고, 최신 비매칭 항목이 그 자리를 차지하지 않는다.
- `since`/`until` 과 AND 조합된다. 매칭 0건이면 `clusterSize` 0·빈 `results`·`truncated` 부재다. seed 모드에는 적용되지 않는다.

### AC-collapse-marking — 접힘 표기

- 같은 `clusterKey` 문서 여럿이 활성화된 검색 응답에는 그 클러스터의 항목이 1건만 나타나고, 그 항목이 `clusterKey` 와 `collapsedCount` 를 담는다.

### AC-cluster-expansion — 시드 접촉 클러스터 자동 확장

- 시드 매칭이 닿은 클러스터의 항목은 `expansion`(대표 제외 멤버, matched-first → updated 내림차순, 상한 10, 초과 시 `expansionOmitted`)을 싣는다.
- 전역 멤버가 대표뿐인 클러스터는 `expansion` 을 싣지 않는다. 한 응답의 확장 클러스터는 결과 순위 상위 5개까지이며, 초과분은 `collapsedMembers` 경로를 따른다.
- 확산으로만 결과에 든 클러스터의 접힌 항목은 `expansion` 없이 `collapsedMembers`(상한 5)만 싣는다.
- `expansion` 이 있는 항목은 `collapsedMembers` 를 싣지 않는다. `results` 의 순서·점수·구성은 두 필드와 무관하게 불변이다.

## History

- 2026-08-21 — cluster 모드에 `match` 주제 필터를 추가했다 (title·tags 대소문자 무시 부분매칭, 노드·서고 동일 규칙). 서고 병합으로 계열이 커진 뒤(geeknews 157건·cve 952건) 열거를 주제로 좁힐 수단이 없어 전건 수신 후 육안 선별이 되던 간극의 해소다. 필터→정렬→계수→절단 순서를 계약으로 고정했다 — 절단이 필터보다 먼저 오면 오래된 매칭 항목이 조용히 유실된다.
- 2026-08-21 — cluster 모드에 `max_results` 를 배선했다 (기본 50, 200 캡) — 서고 병합으로 실질 규모가 커진 뒤(cve 952건 → 200건·57KB 응답 실측) 고정 200 반환이 "응답은 가볍게" 원칙과 충돌해, "max_results 미적용" 계약을 페이지 상한으로 교체했다.
- 2026-08-21 — cluster 열거 모드가 서고 멤버(`graph.archiveClusterMembers`)를 병합하도록 개정했다 — 서고 항목은 `archived: true`, `since`/`until` 은 병합 목록의 시간창, `clusterSize` 는 창 내 총원. 구버전 캐시(맵 미존재)는 노드 멤버만으로 동작한다.
- 2026-08-20 — R9·R10: 접힌 항목의 `collapsedMembers` 표기와 시드 접촉 클러스터 자동 확장(`expansion`)을 추가했다. 확장은 시드가 닿은 클러스터에만 붙는다 — "평소에는 대표(증류본)만, 언급 시에만 내부"라는 사용자 확정 설계. `results` 랭킹 불변으로 평가 하네스와 격리한다.
- 2026-08-20 — cluster 열거 모드와 collapse 표기를 추가하고 `seed` 를 optional 로 완화했다 (R4). `sub_layer` post-filter 는 쿼리 엔진 `subLayerFilter` 로 이동 — 절단 후 필터의 `max_results` 미달 결함이 함께 해소됐다.
- 2026-08-05 — 참조 메타 기본 응답과 trace/content 옵션 계약을 문서화했다 (cross-review FIX-011).

## Last Updated

2026-08-21 — cluster 모드에 `match` 주제 필터와 파이프라인 순서 계약을 추가했다.
