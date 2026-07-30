# builders

## Purpose

엣지 타입별 생성기. `KnowledgeNode[]` 을 받아 `KnowledgeEdge[]` 를 만드는 순수 함수만 모아 둔다. 어떤 엣지를 물질화할지는 [`graphBuilder`](../INTENT.md)가 정하고, 여기는 타입별 규칙만 소유한다.

## Structure

- `operations/tree.ts` — 디렉토리 계층 기반 PARENT_OF / CHILD_OF 엣지 + 디렉토리 맵
- `operations/relationship.ts` — Person frontmatter 기반 RELATIONSHIP 엣지 (대칭은 양방향, 비대칭은 단방향)
- `operations/domain.ts` — 동일 domain 태그 쌍 간 DOMAIN 엣지 (약한 cross-layer 연결, 양방향)
- `operations/crossLayer.ts` — L5-Boundary 노드에서 `connected_layers` 내 태그 겹침 노드로 CROSS_LAYER 엣지
- `index.ts` — barrel

## Boundaries

### Always do

- 순수 함수 유지 — 입력 노드 배열만 읽고 파일·시각·모듈 상태를 건드리지 않는다
- 엣지 weight 와 상한은 `constants/thresholds.ts` 에서 가져온다 (`MAX_CROSS_LAYER_EDGES_PER_NODE` 등)
- 시스템 생성 엣지는 user-authored LINK 와 구분되게 타입으로 표시한다

### Ask first

- 엣지 타입 추가 또는 weight 변경 (PageRank 초기 가중치에 직접 영향)
- 양방향/단방향 판정 규칙 변경

### Never do

- SIBLING 엣지 물질화 — `node.path` 폴더 멤버십의 O(k²) 전개이므로 런타임 맵 구성 시점에 `operations/deriveSiblingEdges.ts` 가 파생한다
- 입력 노드 배열 변형 (호출자가 소유한다)
- 상한 없는 쌍 전개 (cross-layer 는 노드당 캡을 적용한다)
