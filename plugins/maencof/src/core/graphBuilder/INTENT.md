# graphBuilder

## Purpose

KnowledgeNode 배열에서 KnowledgeGraph 구축. adjacency list, 엣지, 고아 노드 탐지.

직렬화된 샤드에서 런타임 조회 맵(adjacencyList / edgeWeightMap / edgeTypeMap / invertedIndex)을 재수화하는 `hydrateRuntimeMaps` / `rebuildEdgeDerivedMaps`를 제공한다 (metadataStore.loadGraph()와 kgBuild가 공유하는 단일 경로).

SIBLING 은 물질화하지 않는다 — node.path 폴더 멤버십의 O(k²) 전개이므로 graph.edges/직렬화에서 제외하고, 재수화 시점에 `deriveSiblingEdges` 가 파생해 런타임 맵에만 싣는다 (LINK 등 상위 multiplier 타입이 pair 맵 선점 유지).

## Structure

- `index.ts` — 순수 barrel (공개 API: buildGraph/buildAdjacencyList/deriveSiblingEdges/detectOrphans/hydrateRuntimeMaps/rebuildEdgeDerivedMaps + invertedIndex 4함수 + 타입)
- `types/` organ — 공개 타입 (GraphBuilderOptions/GraphBuildResult)
- `operations/` organ — 그래프 조립·런타임 맵 (buildGraph/buildAdjacencyList/deriveSiblingEdges/detectOrphans/hydrateRuntimeMaps/rebuildEdgeDerivedMaps + private buildEdgePairMaps, 함수 1개/파일)
- `invertedIndex/` organ — 역 인덱스 (tokenizeForInvertedIndex 단일 출처 + add/remove/build, 함수 1개/파일)
- `builders/` organ — 엣지 빌더 (tree=계층/relationship/domain/crossLayer)

## Boundaries

### Always do

- SYMMETRIC_RELATIONSHIPS 참조
- NodeId 기반 인덱싱

### Ask first

- 엣지 타입 추가

### Never do

- 외부 I/O 수행
