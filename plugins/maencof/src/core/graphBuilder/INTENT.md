# graphBuilder

## Purpose

KnowledgeNode 배열에서 KnowledgeGraph 구축. adjacency list, 엣지, 고아 노드 탐지.

직렬화된 샤드에서 런타임 조회 맵(adjacencyList / edgeWeightMap / edgeTypeMap / invertedIndex)을 재수화하는 `hydrateRuntimeMaps` / `rebuildEdgeDerivedMaps`를 제공한다 (metadataStore.loadGraph()와 kgBuild가 공유하는 단일 경로).

SIBLING 은 물질화하지 않는다 — node.path 폴더 멤버십의 O(k²) 전개이므로 graph.edges/직렬화에서 제외하고, 재수화 시점에 `deriveSiblingEdges` 가 파생해 런타임 맵에만 싣는다 (LINK 등 상위 multiplier 타입이 pair 맵 선점 유지).

## Conventions

빌드 직후와 디스크 리로드가 재수화 경로를 공유해야 SA와 시드 해석이 일치한다. 역 인덱스의 전체·증분 갱신도 같은 토크나이저를 사용한다.

## Boundaries

### Always do

- SYMMETRIC_RELATIONSHIPS 참조
- NodeId 기반 인덱싱

### Ask first

- 엣지 타입 추가

### Never do

- 외부 I/O 수행
