# queryEngine — Contract

## Requirements

- `query(graph, seeds, options)` 는 시드 해석 → QGA-SA → 필터 → **클러스터 collapse** → 절단(slice) 순으로 실행된다. collapse 는 path-exact 시드 제외 뒤·`maxResults` 절단 앞의 한 지점에서만 일어난다 — kg_search·kg_context(`selectContextCandidates`)·평가 하네스(`liveSearchFn`)가 전부 이 지점을 지나므로, 소비자별 collapse 재구현은 금지다.
- collapse 의미론: 같은 `clusterKey` 를 가진 결과는 대표 1건으로 접힌다. 같은 스레드 문서 N건은 독립 증거가 아니라 같은 사건의 반복 관측이다.
  - 그룹 점수는 결과 집합 내 활성 멤버의 **max 승계** — sum 은 수 프리미엄을 부활시키므로 금지.
  - 대표는 **활성 필터(layer/sub_layer/time)를 만족하는 그래프 전역 클러스터 멤버 중 `updated` 최신**이다. tie-break: `updated` 동일 → 활성 멤버 우선 → nodeId 사전순. `updated` 가 YYYY-MM-DD 형식이 아니면 `mtime` 파생 날짜로 비교한다.
  - 대표가 결과에 없던 전역 멤버로 승계되면 `hops` 는 활성 멤버 최소 hops, `path`(trace)는 빈 배열이다 — SA 경로가 성립하지 않는다.
  - `collapsedCount` = 이 결과에서 접힌 활성 멤버 수(대표가 활성 멤버면 m−1, 전역 승계면 m), 1 이상일 때만 실린다. `clusterKey` 는 멤버 1건이어도 실린다(호출자의 열기 질의용).
  - `clusterKey` 없는 노드는 개별 경쟁을 유지한다.
- 클러스터 전역 멤버 수집은 결과에 등장한 키에 대한 `graph.nodes` 1패스다 — 별도 인덱스를 두지 않는다(partialReindex 등 3개 유지 경로 동기화 비용이 1패스 비용을 넘는다).
- `subLayerFilter` 는 `layerFilter` 와 같은 위치(SA 후·collapse 전)의 pre-filter 다. 소비자(kg_search/kg_context)의 post-slice 필터는 금지 — 절단 후 필터는 `maxResults` 미달을 만든다.
- `archived: true` 노드는 키워드 시드 채택 점수에 `ARCHIVED_SEED_MULTIPLIER`(0.3)를 곱해 강등한다 — 본문이 빈 스텁이 태그 채널 경쟁력으로 정제 지식을 밀어내지 못하게 한다(침강). path-exact/path-prefix 시드에는 적용하지 않는다 — 직접 지목은 존중된다.
- `exploredNodes` 는 collapse·절단 이전의 활성 노드 수다(탐색량 지표, 출력량 아님).
- 캐시는 최종(collapse 포함) 결과를 저장한다. 캐시 키는 (seeds, 열거된 options 필드, builtAt)이다 — 키는 필드 열거식(`queryCache.makeKey`)이므로 **QueryOptions 에 결과에 영향 주는 필드를 추가하면 키에도 반드시 추가한다**. `subLayerFilter` 포함.

## API Contracts

- barrel `index.ts` — `query` · `QueryEngine` · `invalidateQueryCache` · `resolveSeedNodes` · `deriveContextSeeds` + 타입.
- `QueryOptions` — `maxResults`(10) · `maxHops`(5) · `layerFilter` · `subLayerFilter` · `since`/`until` · `tuning`(스윕 전용) · `decay`/`threshold`(v1 은퇴, 무시).
- `QueryResult.results: ActivationResult[]` — collapse 후 항목은 optional `clusterKey`/`collapsedCount` 를 가질 수 있다(정본: `types/graph.ts`).
- `collapseClusters(results, graph, isEligible)` 는 `query/` 내부 전용이다 — barrel 에 올리지 않는다.

## Acceptance Criteria

### AC-collapse-before-slice — 절단 전 collapse

- 같은 `clusterKey` 문서 8건이 활성화되어도 `maxResults: 10` 결과에는 그 클러스터의 대표 1건만 나타나고, 접힌 수가 `collapsedCount` 로 표기된다.

### AC-global-succession — 전역 대표 승계

- 클러스터의 `updated` 최신 문서(증류본)가 검색에 활성화되지 않았어도, 같은 클러스터의 다른 멤버가 활성화되면 최신 문서가 대표로 승계되고 점수는 활성 멤버 max 를 물려받는다.

### AC-filter-eligible-representative — 필터 정합 대표

- 활성 필터(layer/sub_layer/time)를 만족하지 않는 전역 멤버는 대표가 될 수 없다.

### AC-no-cluster-untouched — 무클러스터 불변

- `clusterKey` 없는 노드만 있는 결과는 collapse 전후가 동일하다.

### AC-sublayer-prefilter — sub_layer 절단 전 필터

- `subLayerFilter` 가 있어도 조건을 만족하는 결과가 `maxResults` 이상이면 결과 수는 `maxResults` 를 채운다.

## History

- 2026-08-20 — 클러스터 collapse 를 query() 내부(절단 전)에 도입했다 (R4). 대표 선정을 "활성 멤버 중 최신"으로 좁힌 초안은 3자 리뷰(codex·antigravity·claude)가 일치 기각 — 어휘가 얇은 증류본이 활성화되지 않는 질의에서 승계가 깨져 P3(원본 미침강)가 재현된다. 요청서 문언(클러스터 내 updated 최신)대로 전역 멤버 승계로 확정하고, 점수만 활성 멤버 max 로 승계해 점수 의미를 보존한다.
- 2026-08-20 — `sub_layer` 를 소비자 post-filter 에서 `subLayerFilter` pre-filter 로 승격했다. post-slice 필터가 `maxResults` 미달을 만드는 기존 결함도 함께 해소된다.

## Last Updated

2026-08-20 — 클러스터 collapse 계약과 subLayerFilter 를 추가했다 (R4).
