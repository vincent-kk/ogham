# queryEngine — Contract

## Requirements

- `query(graph, seeds, options)` 는 시드 해석 → QGA-SA → 필터 → **클러스터 collapse** → 절단(slice) 순으로 실행된다. collapse 는 path-exact 시드 제외 뒤·`maxResults` 절단 앞의 한 지점에서만 일어난다 — kg_search·kg_context(`selectContextCandidates`)·평가 하네스(`liveSearchFn`)가 전부 이 지점을 지나므로, 소비자별 collapse 재구현은 금지다.
- collapse 의미론: 같은 `clusterKey` 를 가진 결과는 대표 1건으로 접힌다. 같은 스레드 문서 N건은 독립 증거가 아니라 같은 사건의 반복 관측이다.
  - 그룹 점수는 결과 집합 내 활성 멤버의 **max 승계** — sum 은 수 프리미엄을 부활시키므로 금지.
  - 대표는 **시드 지목(designation) 멤버 우선, 없으면 활성 필터(layer/sub_layer/time)를 만족하는 그래프 전역 클러스터 멤버 중 `updated` 최신**이다. 지목이 둘 이상이면 그중 `updated` 최신. 이후 tie-break: `updated` 동일 → 활성 멤버 우선 → nodeId 사전순. `updated` 가 YYYY-MM-DD 형식이 아니면 `mtime` 파생 날짜로 비교한다. 지목 멤버도 활성 필터를 만족해야 한다. path-exact 시드 노드는 결과 제외 계약의 연장으로 **전역 대표 후보에서도 제외**된다 — 제외된 문서가 최신이라는 이유로 대표로 부활하지 않는다.
  - "지목"은 한 키워드 시드의 어휘 매칭 후보 집합(시드 budget 캡 **이전**)이 그 클러스터 안에서 **정확히 1개 노드**일 때 그 노드다 (R8). 캡 이후 채택 집합 기준이 아니다 — 캡 경계 절단이 광범위 주제어를 유일 지목으로 오인시킨다. 여러 멤버와 매칭되는 스레드 주제어는 지목을 만들지 않는다 — 증류본 자동 승계는 그 경로에서 보존된다. path-exact 시드는 결과 제외 계약이 우선이므로 지목에서 제외한다.
  - 대표가 결과에 없던 전역 멤버로 승계되면 `hops` 는 활성 멤버 최소 hops, `path`(trace)는 빈 배열이다 — SA 경로가 성립하지 않는다.
  - `collapsedCount` = 이 결과에서 접힌 활성 멤버 수(대표가 활성 멤버면 m−1, 전역 승계면 m), 1 이상일 때만 실린다. `clusterKey` 는 멤버 1건이어도 실린다(호출자의 열기 질의용).
  - `clusterKey` 없는 노드는 개별 경쟁을 유지한다.
  - 접힌 항목은 `collapsedMembers`(접힌 활성 멤버 id, score 내림차순 → nodeId 사전순, 상한 `COLLAPSED_MEMBER_LIST_CAP`=5)를 싣는다 — `collapsedCount` 가 있을 때만 (R9). 나머지 개수는 `collapsedCount` 가 보고한다.
  - `QueryResult.clusterMatches` 는 최종 결과에 존재하는 clusterKey 중 시드 어휘 매칭(캡 이전)이 닿은 키만 담고, 값은 매칭된 멤버 id 다 (R10 트리거 입력) — 확산 전용 클러스터는 키가 없다. 소비자(kg_search)의 확장 조립 계약 정본은 `mcp/tools/kgSearch/DETAIL.md`.
- 클러스터 전역 멤버 수집은 결과에 등장한 키에 대한 `graph.nodes` 1패스다 — 별도 인덱스를 두지 않는다(partialReindex 등 3개 유지 경로 동기화 비용이 1패스 비용을 넘는다).
- `subLayerFilter` 는 `layerFilter` 와 같은 위치(SA 후·collapse 전)의 pre-filter 다. 소비자(kg_search/kg_context)의 post-slice 필터는 금지 — 절단 후 필터는 `maxResults` 미달을 만든다.
- 클러스터 앵커 게이트 (R11): `sub_layer: clusterseed` 노드는 시드로 특정된 경우(키워드 어휘 매칭 — 시드 budget 캡 이전 — 또는 path 시드 채택)에만 `results` 에 수록된다 — 확산만으로는 수록되지 않는다. collapse 의 전역 대표 후보 자격은 게이트와 무관하게 유지된다: 클러스터가 다른 멤버로 결과에 들면 비매칭 앵커도 대표로 승계될 수 있다.
- `archived: true` 노드는 키워드 시드 채택 점수에 `ARCHIVED_SEED_MULTIPLIER`(0.3)를 곱해 강등한다 — 본문이 빈 스텁이 태그 채널 경쟁력으로 정제 지식을 밀어내지 못하게 한다(침강). path-exact/path-prefix 시드에는 적용하지 않는다 — 직접 지목은 존중된다.
- `exploredNodes` 는 collapse·절단 이전의 활성 노드 수다(탐색량 지표, 출력량 아님).
- 캐시는 최종(collapse 포함) 결과를 저장한다. 캐시 키 구성과 무효화 계약의 정본은 `queryCache/DETAIL.md` 다 — 키는 필드 열거식이므로 **QueryOptions 에 결과에 영향 주는 필드를 추가하면 그 열거에도 반드시 추가한다**.

## API Contracts

- barrel `index.ts` — `query` · `QueryEngine` · `invalidateQueryCache` · `resolveSeedNodes` · `deriveContextSeeds` + 타입.
- `QueryOptions` — `maxResults`(10) · `maxHops`(5) · `layerFilter` · `subLayerFilter` · `since`/`until` · `tuning`(스윕 전용) · `decay`/`threshold`(v1 은퇴, 무시).
- `QueryResult.results: ActivationResult[]` — collapse 후 항목은 optional `clusterKey`/`collapsedCount` 를 가질 수 있다(정본: `types/graph.ts`).
- `collapseClusters(results, graph, isEligible, designatedIds?)` 는 `query/` 내부 전용이다 — barrel 에 올리지 않는다. `designatedIds` 기본값은 빈 집합(= 지목 없음 경로).
- `resolveSeedNodes` 는 `seedMatches`(입력 seeds 와 같은 순서의 시드별 캡 이전 어휘 매칭 후보 집합, path/미해석 시드는 빈 집합)를 함께 반환한다 — 지목 판정의 입력.

## Acceptance Criteria

### AC-collapse-before-slice — 절단 전 collapse

- 같은 `clusterKey` 문서 8건이 활성화되어도 `maxResults: 10` 결과에는 그 클러스터의 대표 1건만 나타나고, 접힌 수가 `collapsedCount` 로 표기된다.

### AC-global-succession — 전역 대표 승계

- 클러스터의 `updated` 최신 문서(증류본)가 검색에 활성화되지 않았어도, 같은 클러스터의 다른 멤버가 활성화되면 최신 문서가 대표로 승계되고 점수는 활성 멤버 max 를 물려받는다.

### AC-filter-eligible-representative — 필터 정합 대표

- 활성 필터(layer/sub_layer/time)를 만족하지 않는 전역 멤버는 대표가 될 수 없다.

### AC-seed-designation-priority — 시드 지목 최우선 대표

- 같은 `clusterKey` 문서 N건 중 `updated` 최신이 아닌 멤버를, 그 멤버 하나에만 어휘 매칭되는 식별자 시드로 질의하면 그 멤버가 대표로 반환된다 (top-1).
- 클러스터의 여러 멤버와 매칭되는 주제어 시드는 지목을 만들지 않는다 — `updated` 최신 전역 멤버(증류본) 승계가 유지된다.
- path-exact 시드는 지목되지 않는다 — 같은 노드를 키워드 시드가 지목해도 결과 제외가 우선한다.

### AC-no-cluster-untouched — 무클러스터 불변

- `clusterKey` 없는 노드만 있는 결과는 collapse 전후가 동일하다.

### AC-sublayer-prefilter — sub_layer 절단 전 필터

- `subLayerFilter` 가 있어도 조건을 만족하는 결과가 `maxResults` 이상이면 결과 수는 `maxResults` 를 채운다.

### AC-collapsed-members — 접힌 멤버 목록

- 접힌 항목은 접힌 활성 멤버 id 를 score 내림차순 상한 5로 싣고, 접힘이 없으면 싣지 않는다.

### AC-cluster-matches — 시드 접촉 클러스터 보고

- 시드 매칭이 닿은 클러스터만 `clusterMatches` 에 키가 있고, 확산으로만 결과에 든 클러스터는 없다.

### AC-clusterseed-gate — 클러스터 앵커 격리

- `sub_layer: clusterseed` 노드는 확산만으로는 결과에 나타나지 않고, 시드로 특정되면 나타난다.
- 비매칭 앵커도 자기 클러스터가 결과에 들면 대표로 승계될 수 있다 (승계 자격 유지 — 사용자 확정).

## History

- 2026-08-20 — R8: 대표 선정에 시드 직매칭 최우선 규칙. 실측 회귀(`gcc-3876` 질의가 자기 문서 대신 클러스터 최신 문서를 반환) 교정. "직매칭"은 시드별×클러스터별 유일 어휘 매칭(지목)으로 조작화 — 요청서 문언(매칭 멤버 전체 승격)대로면 주제어 시드가 증류본 승계를 파괴해 수용 기준 2·3(cluster-digest-succession)과 충돌하기 때문이다.
- 2026-08-20 — R9·R10·R11: 접힌 항목의 `collapsedMembers`(상한 5), 시드 접촉 클러스터 보고 `clusterMatches`(kg_search 자동 확장의 트리거), `sub_layer: clusterseed` 앵커 게이트를 추가했다. 앵커는 확산만으로는 결과에 들지 않되 대표 승계 자격은 유지한다(사용자 확정) — "평소에는 대표만, 언급 시에만 내부" 설계.
- 2026-08-20 — 클러스터 collapse 를 query() 내부(절단 전)에 도입했다 (R4). 대표 선정을 "활성 멤버 중 최신"으로 좁힌 초안은 3자 리뷰(codex·antigravity·claude)가 일치 기각 — 어휘가 얇은 증류본이 활성화되지 않는 질의에서 승계가 깨져 P3(원본 미침강)가 재현된다. 요청서 문언(클러스터 내 updated 최신)대로 전역 멤버 승계로 확정하고, 점수만 활성 멤버 max 로 승계해 점수 의미를 보존한다.
- 2026-08-20 — `sub_layer` 를 소비자 post-filter 에서 `subLayerFilter` pre-filter 로 승격했다. post-slice 필터가 `maxResults` 미달을 만드는 기존 결함도 함께 해소된다.

## Last Updated

2026-08-20 — R8 시드 지목 대표 규칙과 R9·R10·R11 표면·게이트 계약을 추가했다.
