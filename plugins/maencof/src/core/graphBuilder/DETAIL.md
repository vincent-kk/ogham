# graphBuilder — Contract

## Requirements

- `KnowledgeNode[]` 에서 `KnowledgeGraph` 를 조립하고, 직렬화된 샤드에서 런타임 조회 맵을 재수화한다. 외부 I/O 를 수행하지 않는다 — 입력은 노드 배열 또는 이미 적재된 그래프뿐이다.
- 물질화하는 엣지는 LINK · PARENT_OF/CHILD_OF · RELATIONSHIP · DOMAIN · CROSS_LAYER 다. **SIBLING 은 물질화하지 않는다** — `node.path` 폴더 멤버십의 O(k²) 전개라서 디스크에 쓰면 인덱스가 폭증한다. 런타임 맵 구성 시점에 `deriveSiblingEdges` 가 파생해 맵에만 싣는다.
- 파생 SIBLING 은 실엣지 **뒤** 에 스트림된다. LINK 등 `EDGE_TYPE_MULTIPLIER` 가 높은 타입이 (from,to) 쌍 슬롯을 선점해야 하고, 하한 도입 이전 인덱스에 남아 있는 SIBLING 실엣지와도 중복 없이 병합되어야 하기 때문이다.
- 빌드 직후(`kgBuild`)와 디스크 리로드(`metadataStore.loadGraph`)가 같은 맵 구성 로직을 공유한다. `hydrateRuntimeMaps` 가 그 단일 출처이며, 두 경로가 갈라지면 SA·시드 해석 의미론이 어긋난다.
- 평행/중복 엣지는 두 곳에서 결정적으로 접힌다. 인접 리스트는 같은 이웃을 1회만 등록하고(degree 과대계산 방지), pair 맵은 `EDGE_TYPE_MULTIPLIER` 가 높은 타입을 채택한다(동률은 엣지 배열 순서상 먼저 등장한 것). weight 와 type 은 항상 같은 승자 엣지에서 나온다.
- 역 인덱스 토큰 구성은 `tokenizeForInvertedIndex` 한 곳에서만 한다. 전체 빌드와 증분 add/remove 가 같은 토크나이저를 써야 tokenization drift 가 생기지 않는다.
- `rebuildEdgeDerivedMaps` 는 맵이 하나도 부착돼 있지 않으면 no-op 이다. "맵 부재 → 폴백" 계약을 유지하기 위해서이며, 없는 맵을 새로 만들지 않는다.

## API Contracts

### Entry point (`index.ts`)

- `buildGraph(nodes, options?): GraphBuildResult` — 노드 배열에서 그래프·인접 리스트·역 인덱스·고아 목록을 만든다.
- `buildAdjacencyList(nodeMap, edges): AdjacencyList` — 중복 이웃을 접은 인접 리스트.
- `deriveSiblingEdges(nodeMap): Generator<KnowledgeEdge>` — 디렉토리 멤버십에서 SIBLING 파생.
- `detectOrphans(nodeMap, edges): NodeId[]` — 엣지가 하나도 없는 노드.
- `hydrateRuntimeMaps(graph): KnowledgeGraph` — 네 맵을 재구성해 부착하고 같은 reference 반환(in-place).
- `rebuildEdgeDerivedMaps(graph): void` — 엣지 파생 맵 3종만 재구성. `invertedIndex` 는 건드리지 않는다.
- `tokenizeForInvertedIndex` · `addNodeToInvertedIndex` · `removeNodeFromInvertedIndex` · `buildInvertedIndex` — 역 인덱스 4함수.
- 타입: `GraphBuilderOptions` · `GraphBuildResult`.

### `buildGraph(nodes, options)`

- `options.includeOrphans` (기본 true) — false 면 고아 노드를 `graph.nodes` 에서 제거하고 `nodeCount` 를 다시 센다. `orphanNodes` 목록은 제거 여부와 무관하게 언제나 반환된다.
- LINK 엣지는 `node.outboundLinks` 에서 만들되 **그래프에 실재하는 대상만** 잇는다(`weight: 1.0`). 나머지 타입은 `builders/` 하위 fractal 이 만든다.
- `graph.builtAt` 은 이 함수가 찍는 ISO 시각이다.

### `GraphBuildResult`

`{ graph, adjacencyList, invertedIndex, orphanNodes }` — 맵 3종은 `graph` 에 부착되지 않고 결과 필드로 나온다. 부착은 `hydrateRuntimeMaps` 의 일이다.

### 런타임 맵 4종

`adjacencyList` · `edgeWeightMap` · `edgeTypeMap` · `invertedIndex`. 앞의 셋은 엣지 파생, 마지막은 노드 파생이라 재구성 경로가 다르다.

### 역 인덱스 토큰

노드 `title` 을 `WORD_BOUNDARY_SPLIT_REGEX` 로 자른 단어 + `tags` + `mentioned_persons`. 전부 lowercase 이고 빈 문자열은 제외된다. term Set 이 비면 term 자체를 삭제해 누수를 막는다.

## Acceptance Criteria

### AC-sibling-not-materialized — SIBLING 비물질화

- `buildGraph` 결과의 `graph.edges` 에 SIBLING 타입 엣지가 없고, 런타임 맵에는 형제 관계가 나타난다.

### AC-real-edges-win-pair-slot — 실엣지 선점

- 같은 (from,to) 에 LINK 와 파생 SIBLING 이 겹칠 때 pair 맵이 LINK 를 유지한다.

### AC-hydrate-single-source — 재수화 단일 출처

- 빌드 직후 그래프와 디스크에서 리로드한 그래프의 런타임 맵이 같은 구성 로직으로 만들어진다.

### AC-adjacency-deduplicated — 인접 중복 제거

- 같은 from→to 가 여러 타입으로 존재해도 인접 리스트에 이웃이 한 번만 들어간다.

### AC-tokenizer-single-source — 토크나이저 단일 출처

- 전체 빌드와 증분 add/remove 가 같은 토큰 목록을 만든다.

### AC-rebuild-noop-without-maps — 맵 부재 시 no-op

- 세 엣지 파생 맵이 모두 없는 그래프에 `rebuildEdgeDerivedMaps` 를 부르면 아무 맵도 새로 부착되지 않는다.

### AC-link-targets-must-exist — LINK 대상 실재

- `outboundLinks` 가 가리키는 대상이 `graph.nodes` 에 없으면 LINK 엣지가 만들어지지 않는다.

## Last Updated

2026-07-30 — SIBLING 비물질화·재수화 단일 출처·중복 엣지 결정 규칙·역 인덱스 토크나이저 계약을 문서화했다.
