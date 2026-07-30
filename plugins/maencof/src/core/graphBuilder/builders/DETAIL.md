# builders — Contract

## Requirements

- 이 fractal 은 엣지 타입별 생성 규칙만 소유한다. 어떤 엣지를 물질화할지는 부모 `graphBuilder` 가 정하고, 여기 함수들은 `KnowledgeNode[]` 을 받아 `KnowledgeEdge[]` 를 돌려주는 순수 함수다.
- 순수성을 지킨다. 파일·시각·모듈 상태를 읽지 않고 입력 노드 배열을 변형하지 않는다 — 배열은 호출자가 소유한다.
- SIBLING 엣지를 만들지 않는다. 폴더 멤버십의 O(k²) 전개라 런타임 맵 구성 시점에 `operations/deriveSiblingEdges.ts` 가 파생하며, 여기서 물질화하면 그 설계가 무너진다. 이 fractal 이 폴더 멤버십에 대해 제공하는 것은 `buildDirectoryMap` 한 개다.
- 상한 없는 쌍 전개를 하지 않는다. cross-layer 는 노드당 `MAX_CROSS_LAYER_EDGES_PER_NODE` 캡을 적용한다.
- 임계값·상한은 `constants/thresholds.ts` 에서 가져온다. 시스템이 만든 엣지는 사용자가 쓴 LINK 와 타입으로 구분된다.

## API Contracts

### Entry point (`index.ts`)

- `buildDirectoryMap(nodes): Map<string, NodeId[]>`
- `buildHierarchyEdges(nodes, nodeMap): KnowledgeEdge[]`
- `buildRelationshipEdges(nodes): KnowledgeEdge[]`
- `buildDomainEdges(nodes): KnowledgeEdge[]`
- `buildCrossLayerEdges(nodes): KnowledgeEdge[]`

### `buildDirectoryMap(nodes)`

노드를 디렉토리 경로별로 묶는다. 경로에 `/` 가 없으면 키는 빈 문자열이다. 계층 엣지와 SIBLING 파생이 공유하는 그룹화다.

### `buildHierarchyEdges(nodes, nodeMap)`

상위 디렉토리에 `index.md` 노드가 **존재할 때만** 그 노드와 자식 사이에 `PARENT_OF` / `CHILD_OF` 를 양방향으로 만든다(각 `weight: 1.0`). 루트에 도달한 노드는 건너뛴다.

### `buildRelationshipEdges(nodes)`

`person` frontmatter 가 있는 노드끼리만 쌍을 전개해 `RELATIONSHIP` 엣지를 만든다(`weight: 0.6`). 관계 타입이 `SYMMETRIC_RELATIONSHIPS` 에 있으면 양방향 2개, 아니면 앞 노드에서 뒤 노드로 단방향 1개다. 대칭 판정은 쌍의 앞 노드 `relationship_type` 을 쓴다.

### `buildDomainEdges(nodes)`

같은 `domain` 값을 가진 노드끼리 `DOMAIN` 엣지를 양방향으로 만든다(`weight: 0.3` — 약한 cross-layer 연결). 같은 domain 의 노드가 2개 미만이면 아무것도 만들지 않는다.

### `buildCrossLayerEdges(nodes)`

`subLayer === 'boundary'` 이고 `connectedLayers` 가 비지 않은 노드에서 시작한다. 대상은 `connectedLayers` 가 지목한 레이어의 노드 중 태그가 하나라도 겹치는 것이며, 엣지는 양방향(`weight: 1.0`)이다. boundary 노드 하나당 `MAX_CROSS_LAYER_EDGES_PER_NODE` 에 도달하면 남은 레이어 탐색까지 중단한다. boundary 노드가 없으면 즉시 빈 배열이다.

## Acceptance Criteria

### AC-pure-builders — 순수성

- 같은 노드 배열에 대해 같은 엣지 목록을 만들고 입력 배열을 변형하지 않는다.

### AC-no-sibling-materialization — SIBLING 미생성

- 어떤 빌더도 `SIBLING` 타입 엣지를 반환하지 않는다.

### AC-hierarchy-requires-index — 계층 엣지 전제

- 상위 디렉토리에 `index.md` 노드가 없으면 계층 엣지가 생기지 않는다.

### AC-symmetry-decides-direction — 대칭 방향 판정

- 대칭 관계는 양방향 2개, 비대칭 관계는 단방향 1개를 만든다.

### AC-cross-layer-capped — cross-layer 상한

- boundary 노드당 CROSS_LAYER 확장이 `MAX_CROSS_LAYER_EDGES_PER_NODE` 를 넘지 않는다.

### AC-tag-overlap-required — 태그 겹침 요구

- 태그가 겹치지 않는 후보에는 CROSS_LAYER 엣지가 생기지 않는다.

## Last Updated

2026-07-30 — 타입별 생성 규칙·순수성·SIBLING 미생성·cross-layer 상한 계약을 문서화했다.
