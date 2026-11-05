# graphBuilder — Contract

## Requirements

- `KnowledgeNode[]` 에서 `KnowledgeGraph` 를 조립하고, 직렬화된 샤드에서 런타임 조회 맵을 재수화한다. 외부 I/O 를 수행하지 않는다 — 입력은 노드 배열 또는 이미 적재된 그래프뿐이다.
- 물질화하는 엣지는 LINK · PARENT_OF/CHILD_OF · RELATIONSHIP · DOMAIN · CROSS_LAYER 다. **SIBLING 은 물질화하지 않는다** — `node.path` 폴더 멤버십의 O(k²) 전개라서 디스크에 쓰면 인덱스가 폭증한다. 런타임 맵 구성 시점에 `deriveSiblingEdges` 가 파생해 맵에만 싣는다.
- 파생 SIBLING 은 실엣지 **뒤** 에 스트림된다. LINK 등 `EDGE_TYPE_MULTIPLIER` 가 높은 타입이 (from,to) 쌍 슬롯을 선점해야 하고, 하한 도입 이전 인덱스에 남아 있는 SIBLING 실엣지와도 중복 없이 병합되어야 하기 때문이다.
- 빌드 직후(`kgBuild`)와 디스크 리로드(`metadataStore.loadGraph`)가 같은 맵 구성 로직을 공유한다. `hydrateRuntimeMaps` 가 그 단일 출처이며, 두 경로가 갈라지면 SA·시드 해석 의미론이 어긋난다.
- 역 인덱스 토큰 구성은 `tokenizeForInvertedIndex` 한 곳에서만 한다. 전체 빌드와 증분 add/remove 가 같은 토크나이저를 써야 tokenization drift 가 생기지 않는다.
- `rebuildEdgeDerivedMaps` 는 맵이 하나도 부착돼 있지 않으면 no-op 이다. "맵 부재 → 폴백" 계약을 유지하기 위해서이며, 없는 맵을 새로 만들지 않는다.
- 인접 이웃의 중복으로 degree를 부풀리지 않고 pair 맵의 weight와 type은 같은 승자 엣지에서 가져온다. 타입 우선순위가 바뀌면 SA 의미가 달라지므로 결정적 선택을 유지한다.

## API Contracts

- 엣지 파생 맵과 노드 파생 역 인덱스는 갱신 범위가 다르다. 엣지 재구성이 역 인덱스를 바꾸지 않도록 한다.
- `buildGraph` 결과와 런타임 맵 부착은 별도 단계다. 맵이 없는 그래프의 폴백 경로를 유지하며 재수화는 빌드와 리로드가 공유한다.

## Acceptance Criteria

### AC-sibling-not-materialized — SIBLING 비물질화

- `buildGraph` 결과의 `graph.edges` 에 SIBLING 타입 엣지가 없고, 런타임 맵에는 형제 관계가 나타난다.

### AC-hydrate-single-source — 재수화 단일 출처

- 빌드 직후 그래프와 디스크에서 리로드한 그래프의 런타임 맵이 같은 구성 로직으로 만들어진다.

### AC-tokenizer-single-source — 토크나이저 단일 출처

- 전체 빌드와 증분 add/remove 가 같은 토큰 목록을 만든다.

### AC-link-targets-must-exist — LINK 대상 실재

- `outboundLinks` 가 가리키는 대상이 `graph.nodes` 에 없으면 LINK 엣지가 만들어지지 않는다.

## Last Updated

엣지 물질화·재수화 공유·맵 갱신의 불변식이 바뀔 때 갱신한다.
