# lensNavigate — Contract

## Requirements

- `@ogham/maencof` 의 `handleKgNavigate` 를 감싸는 얇은 어댑터다. 그래프 이웃 탐색을 여기서 다시 만들지 않는다.
- 호출별 레이어 필터를 받지 않는다. `computeEffectiveLayers(vaultLayers, undefined)` 를 호출하므로 유효 레이어는 항상 볼트 설정 상한(기본 L2–L5)이다.
- maencof 이웃 탐색은 레이어를 모른다. 따라서 필터는 **응답 후처리**다: `inbound`·`outbound`·`children` 배열에서 유효 레이어 밖 노드를 제거한 뒤 돌려준다.
- `layer` 필드가 없는 항목은 남긴다 — 레이어를 알 수 없다는 이유로 이웃을 지우면 그래프가 끊긴 것처럼 보인다.
- 원본 응답을 제자리에서 고치지 않는다. 얕은 복사본에 필터 결과를 얹어 캐시된 그래프 파생 객체를 오염시키지 않는다.
- 인덱스 부재는 예외가 아니라 결과 필드다. `error` 를 담은 객체로 재색인 방법을 알린다.
- 재색인을 실행하지 않고 볼트에 쓰지 않는다 — 의존은 `handleKgNavigate` 와 `computeEffectiveLayers` 둘뿐이다.

## API Contracts

- `handleLensNavigate(graph: KnowledgeGraph | null, input: LensNavigateInput, vaultLayers: number[]): Promise<Record<string, unknown>>` — 후처리된 이웃 응답. `vaultLayers` 는 해석된 볼트의 layer 상한.
- `LensNavigateInput` — `path`(필수, 노드 경로), `vault`·`include_inbound`·`include_outbound`·`include_hierarchy`(선택). `layer_filter` 는 입력에 없다.
- 반환 객체는 maencof 응답의 얕은 복사이며, 존재하는 `inbound`·`outbound`·`children` 키만 필터된 배열로 교체된다. 그 밖의 키는 원본 그대로다.
- `graph` 가 `null` 이거나 maencof 결과에 `error` 가 있으면 `{ error: "Vault index not available. Run kg_build in a maencof session." }` 를 돌려준다.

## Acceptance Criteria

### AC-post-filter-neighbors — 이웃 후처리

- 볼트 상한 밖 레이어 노드가 `inbound`·`outbound`·`children` 결과에서 빠진다.
- `layer` 가 없는 항목은 그대로 남는다.
- 배열이 아닌 값이 들어와도 throw 없이 원본이 유지된다.

### AC-ceiling-only — 상한 고정

- 입력에 호출별 레이어 필터가 없고, 유효 레이어가 항상 볼트 상한과 같다.

### AC-index-absent — 인덱스 부재 보고

- `graph` 가 `null` 이면 throw 하지 않고 `error` 필드가 담긴 객체가 나온다.
- 그 문장이 재색인 수단을 지목한다.

## Last Updated

2026-07-30 — 이웃 응답 후처리와 상한 고정 계약을 문서화했다.
