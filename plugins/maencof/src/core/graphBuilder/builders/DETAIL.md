# builders — Contract

## Requirements

- 이 fractal 은 엣지 타입별 생성 규칙만 소유한다. 어떤 엣지를 물질화할지는 부모 `graphBuilder` 가 정하고, 여기 함수들은 `KnowledgeNode[]` 을 받아 `KnowledgeEdge[]` 를 돌려주는 순수 함수다.
- 순수성을 지킨다. 파일·시각·모듈 상태를 읽지 않고 입력 노드 배열을 변형하지 않는다 — 배열은 호출자가 소유한다.
- SIBLING 엣지를 만들지 않는다. 폴더 멤버십의 O(k²) 전개라 런타임 맵 구성 시점에 `operations/deriveSiblingEdges.ts` 가 파생하며, 여기서 물질화하면 그 설계가 무너진다. 이 fractal 이 폴더 멤버십에 대해 제공하는 것은 `buildDirectoryMap` 한 개다.
- 상한 없는 쌍 전개를 새로 들이지 않는다 — 그룹 크기의 제곱으로 엣지가 늘어 인덱스가 폭증한다. cross-layer 는 노드당 `MAX_CROSS_LAYER_EDGES_PER_NODE` 캡을 적용한다. DOMAIN·RELATIONSHIP 은 같은 그룹의 모든 쌍을 전개하며 상한이 없다 — 알려진 한계이고, 상한 도입 여부는 그래프 의미를 바꾸므로 Ask first 다.
- 생성 엣지의 초기 weight·상한은 공통 thresholds 상수에서 가져온다 — 같은 정책을 빌더별 리터럴로 복제하여 조정이 갈라지는 것을 막는다. 시스템이 만든 엣지는 사용자가 쓴 LINK 와 타입으로 구분된다.

## API Contracts

상한에 걸리는 cross-layer 후보는 id 순서로 선택한다. 입력 배열 순서를 기준으로 자르면 같은 vault도 스캔 순서에 따라 다른 그래프가 된다. 허브는 레이어와 직교하는 속성이므로 레이어 필터로 대상 역할을 제한하지 않는다.

## Acceptance Criteria

### AC-pure-builders — 순수성

- 같은 노드 배열에 대해 같은 엣지 목록을 만들고 입력 배열을 변형하지 않는다.

### AC-no-sibling-materialization — SIBLING 미생성

- 어떤 빌더도 `SIBLING` 타입 엣지를 반환하지 않는다.

### AC-hierarchy-requires-index — 계층 엣지 전제

- 상위 디렉토리에 `index.md` 노드가 없으면 계층 엣지가 생기지 않는다.

### AC-symmetry-decides-direction — 대칭 방향 판정

- 대칭 관계는 양방향 2개, 비대칭 관계는 단방향 1개를 만든다.

## Last Updated

생성 엣지의 소유권·순수성·cross-layer 상한 정책이 바뀔 때 갱신한다.
