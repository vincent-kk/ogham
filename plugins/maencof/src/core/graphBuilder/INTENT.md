# graphBuilder

## Purpose

KnowledgeNode 배열에서 KnowledgeGraph 구축. adjacency list, 엣지, 고아 노드 탐지.

직렬화된 샤드에서 런타임 조회 맵(adjacencyList / edgeWeightMap / edgeTypeMap / invertedIndex)을 재수화하는 `hydrateRuntimeMaps` / `rebuildEdgeDerivedMaps`를 제공한다 (metadataStore.loadGraph()와 kgBuild가 공유하는 단일 경로).

## Boundaries

### Always do

- SYMMETRIC_RELATIONSHIPS 참조
- NodeId 기반 인덱싱

### Ask first

- 엣지 타입 추가

### Never do

- 외부 I/O 수행
