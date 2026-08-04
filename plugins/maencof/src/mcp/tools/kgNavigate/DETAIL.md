# kgNavigate — Contract

## Requirements

- `kg_navigate` 는 한 노드의 이웃을 단일 O(E) 엣지 패스로 수집한다: inbound/outbound(LINK), parent/children(PARENT_OF), siblings(동일 디렉토리 파생), crossLayer(CROSS_LAYER 양방향 합산), domain(DOMAIN 양방향 합산).
- 이웃 목록(inbound·outbound·children·crossLayer·domain)은 `MAX_NAVIGATE_NEIGHBORS` 상한을 적용하고, 절단된 목록만 `neighborTotals` 에 원총수를 기록한다 — 허브 노드에서 전체 `KnowledgeNode` 배열이 폭주하지 않게 하는 응답 보호다.
- siblings 는 별도 상한 `MAX_NAVIGATE_SIBLINGS`(기본 50)를 따르며 `include_all_siblings: true` 로만 해제된다. 원총수는 `siblingTotalCount` 로 항상 보고한다.
- `include_inbound`/`include_outbound`/`include_hierarchy`(기본 모두 true)로 수집 축을 끈다. hierarchy 를 끄면 parent/children/siblings 가 비워진다.
- `graph` 가 null 이면 재색인 안내, 노드 부재면 `Node not found` 를 담은 `{ error }` 를 돌려준다.

## API Contracts

- `handleKgNavigate(graph: KnowledgeGraph | null, input: KgNavigateInput): Promise<KgNavigateResult | { error: string }>`
- `KgNavigateResult` — `node` · `inbound[]` · `outbound[]` · `parent?` · `children[]` · `siblings[]` · `siblingTotalCount?` · `crossLayer?` · `domain?` · `neighborTotals?`(절단된 키만). 정본은 `types/mcpKg.ts`.

## Acceptance Criteria

### AC-neighbor-cap — 이웃 상한

- 어떤 이웃 목록도 `MAX_NAVIGATE_NEIGHBORS` 를 넘지 않고, 절단이 일어난 목록만 `neighborTotals` 에 원총수가 실린다.

### AC-sibling-cap-liftable — 형제 상한과 해제

- siblings 는 기본 `MAX_NAVIGATE_SIBLINGS` 로 잘리고 `include_all_siblings: true` 면 전체가 반환되며, 두 경우 모두 `siblingTotalCount` 가 절단 전 총수를 보고한다.

## Last Updated

2026-08-05 — 이웃 5목록 상한과 neighborTotals 보고 계약을 문서화했다 (cross-review FIX-013).
