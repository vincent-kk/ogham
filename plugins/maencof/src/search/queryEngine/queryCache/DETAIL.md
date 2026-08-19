# queryCache — Contract

## Requirements

- 캐시 키는 필드 열거식이다. `makeKey` 는 정렬한 seeds 와 `QueryOptions` 의 아홉 필드 — `maxResults` · `decay` · `threshold` · `maxHops` · `layerFilter` · `subLayerFilter` · `since` · `until` · `tuning` — 만 직렬화해 `<정렬된 seeds>::<옵션 JSON>` 을 만든다. **결과에 영향을 주는 필드를 `QueryOptions` 에 추가하면 이 열거에도 반드시 추가한다** — 빠진 필드는 서로 다른 질의를 같은 키로 접어 오답을 히트로 돌려준다. 이 열거가 캐시 키 구성의 정본이며, 소비자 문서는 여기를 가리킨다.
- 옵션 객체를 통째로 직렬화하지 않는 이유는 키 안정성이다. 열거는 필드 순서와 무관한 키를 만들지만, 통째 직렬화는 호출자가 만든 객체의 키 순서와 무관한 여분 필드까지 키에 실어 같은 질의를 갈라 놓는다.
- seeds 는 정렬 후 결합하므로 같은 시드 집합의 순서 차이는 같은 키다.
- `decay` · `threshold` 는 v1 은퇴로 검색 결과에 영향을 주지 않지만 키에 남는다. 호출자가 여전히 보내는 값이고, 이 캐시가 "무시해도 되는 옵션" 판단을 대신 내리면 결과 계약이 두 곳으로 갈라진다.
- 무효화 경로는 둘뿐이다. (1) 관측한 `builtAt` 이 현재 `graph.builtAt` 과 다르면 `get` · `set` 어느 쪽에서 관측하든 전체를 비우고 새 `builtAt` 을 채택한다. (2) `builtAt` 을 바꾸지 않고 그래프를 in-place 로 변경하는 함수(partialReindex 등)는 스스로 `invalidateQueryCache()` 를 호출한다 — 호출자에게 미루지 않는다.
- `clear()` 는 항목과 함께 관측한 `builtAt` 도 지운다. 따라서 클리어 직후 첫 `get` 은 `builtAt` 이 그대로여도 miss 이며, 그 자리에서 현재 `builtAt` 을 다시 채택한다.
- LRU 축출은 `maxEntries`(기본 50) 초과 시 `accessedAt` 이 가장 오래된 항목 1건이다. `get` 히트는 `accessedAt` 을 갱신한다.
- 인메모리 전용이다. 영속화하지 않는다 — 프로세스 밖으로 나간 캐시는 `builtAt` 관측만으로 무효화를 보장할 수 없다.
- 저장하는 값은 `query()` 의 최종 결과다(클러스터 collapse 와 절단까지 끝난 상태). 캐시는 후처리를 다시 하지 않고, 히트 시 저장된 결과를 그대로 돌려준다.

## API Contracts

- barrel `index.ts` — `QueryCache` 하나만 내보낸다. 항목 표현(`CacheEntry`)은 내부 구현이며 노출하지 않는다.
- `new QueryCache(maxEntries = 50)`.
- `get(seeds, options, currentBuiltAt)` — `QueryResult | null`. `builtAt` 불일치는 miss 이자 전체 무효화다.
- `set(seeds, options, currentBuiltAt, result)` — 저장. `builtAt` 불일치면 먼저 전체를 비운다.
- `clear()` — 항목과 관측 `builtAt` 을 모두 비운다. 외부에는 queryEngine 배럴의 `invalidateQueryCache` 로 노출된다.
- `size` — 현재 항목 수(getter).
- `QueryOptions` · `QueryResult` 는 여기서 정의하지 않고 `types/types.ts` 의 정의를 그대로 쓴다.

## Acceptance Criteria

### AC-key-covers-options — 키가 옵션 전 필드를 덮는다

- `QueryOptions` 의 한 필드만 다른 두 질의는 서로 다른 키가 되어 각각 miss 한다 — `subLayerFilter` 포함.
- seeds 의 순서만 다른 두 질의는 같은 키가 되어 두 번째가 히트한다.

### AC-builtat-invalidation — builtAt 자동 무효화

- 같은 질의라도 `builtAt` 이 바뀌면 miss 이고, 이전 `builtAt` 의 항목은 남지 않는다.

### AC-clear-resets-builtat — 클리어 후 첫 조회

- `clear()` 직후 같은 질의의 `get` 은 `builtAt` 이 동일해도 `null` 을 돌려준다.

### AC-lru-eviction — LRU 축출

- `maxEntries` 를 넘겨 저장하면 가장 오래 접근되지 않은 항목이 빠지고, 그 사이 조회된 항목은 남는다.

### AC-entry-point-narrow — 좁은 진입점

- `index.ts` 가 내보내는 심볼은 `QueryCache` 하나다.

## History

- 2026-08-20 — `subLayerFilter` 를 캐시 키에 추가했다. `sub_layer` 가 소비자 post-filter 에서 pre-filter 로 승격되면서 결과에 영향을 주게 되었고, 키에 없으면 필터가 다른 두 질의가 같은 결과를 공유한다. 같은 변경에서 진입점을 `export *` 에서 `export { QueryCache }` 로 좁혔다 — 와일드카드는 구현 파일에 심볼이 하나 늘 때마다 공개 표면을 말없이 넓힌다.

## Last Updated

2026-08-20 — 캐시 키 구성·무효화 계약과 좁혀진 진입점을 문서화했다.
