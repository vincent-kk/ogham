# queryCache — Contract

## Requirements

- 캐시 키는 정렬된 seeds와 결과 관련 옵션의 명시적 열거에서 만든다. **결과에 영향을 주는 필드를 QueryOptions에 추가하면 키 열거에도 반드시 추가한다** — 누락하면 서로 다른 질의를 같은 키로 접어 오답을 히트로 돌려준다. 열거의 정본은 구현이며 소비자 문서는 이 확장 의무를 따른다.
- 옵션 객체를 통째로 직렬화하지 않는 이유는 키 안정성이다. 열거는 필드 순서와 무관한 키를 만들지만, 통째 직렬화는 호출자가 만든 객체의 키 순서와 무관한 여분 필드까지 키에 실어 같은 질의를 갈라 놓는다.
- `decay` · `threshold` 는 현재 검색 결과에 영향을 주지 않지만 호환 입력으로 키에 남는다. 호출자가 여전히 보내는 값이고, 이 캐시가 "무시해도 되는 옵션" 판단을 대신 내리면 결과 계약이 두 곳으로 갈라진다.
- 무효화 경로는 둘뿐이다. (1) 관측한 `builtAt` 이 현재 `graph.builtAt` 과 다르면 `get` · `set` 어느 쪽에서 관측하든 전체를 비우고 새 `builtAt` 을 채택한다. (2) `builtAt` 을 바꾸지 않고 그래프를 in-place 로 변경하는 함수(partialReindex 등)는 스스로 `invalidateQueryCache()` 를 호출한다 — 호출자에게 미루지 않는다.
- 인메모리 전용이다. 영속화하지 않는다 — 프로세스 밖으로 나간 캐시는 `builtAt` 관측만으로 무효화를 보장할 수 없다.
- 저장하는 값은 `query()` 의 최종 결과다(클러스터 collapse 와 절단까지 끝난 상태). 캐시는 후처리를 다시 하지 않고, 히트 시 저장된 결과를 그대로 돌려준다.

## API Contracts

- 공개 표면은 `QueryCache`로 한정하고 내부 항목 표현을 노출하지 않는다. 와일드카드 재노출은 내부 심볼 추가만으로 계약을 넓히므로 사용하지 않는다.
- in-place 그래프 변경은 변경 함수가 직접 무효화한다. 별도 호출을 소비자에게 요구하면 변경과 캐시 갱신이 분리되어 오래된 결과를 돌려준다.

## Acceptance Criteria

### AC-key-covers-options — 키가 옵션 전 필드를 덮는다

- `QueryOptions` 의 한 필드만 다른 두 질의는 서로 다른 키가 되어 각각 miss 한다 — `subLayerFilter` 포함.
- seeds 의 순서만 다른 두 질의는 같은 키가 되어 두 번째가 히트한다.

### AC-clear-resets-builtat — 클리어 후 첫 조회

- `clear()` 직후 같은 질의의 `get` 은 `builtAt` 이 동일해도 `null` 을 돌려준다.

### AC-lru-eviction — LRU 축출

- `maxEntries` 를 넘겨 저장하면 가장 오래 접근되지 않은 항목이 빠지고, 그 사이 조회된 항목은 남는다.

### AC-entry-point-narrow — 좁은 진입점

- `index.ts` 가 내보내는 심볼은 `QueryCache` 하나다.

## Last Updated

캐시 키 확장 의무·무효화 책임·인메모리 경계가 바뀔 때 갱신한다.
