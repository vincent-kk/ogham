# lensSearch — Contract

## Requirements

- `@ogham/maencof` 의 `handleKgSearch` 를 감싸는 얇은 어댑터다. Spreading Activation 랭킹을 여기서 다시 만들지 않는다.
- 호출자가 준 `layer_filter` 를 그대로 넘기지 않는다. `computeEffectiveLayers(vaultLayers, input.layer_filter)` 결과만 전달해 볼트 설정 상한(기본 L2–L5)을 넘는 요청을 차단한다.
- 교집합이 비어도 에러로 만들지 않는다 — layerGuard 계약대로 볼트 상한 전체로 되돌아간다.
- 시드 배열을 손대지 않는다. 항목 분해·정규화·언어 변환 없이 그대로 넘긴다 — 항목 간 합집합, 항목 안 다중 단어의 AND 매칭은 maencof 의 계약이고 그 의미가 여기서 바뀌면 안 된다.
- `sub_layer` 는 문자열로 받아 maencof `SubLayer` 로 넘긴다. 허용값 검증은 서버 스키마와 maencof 핸들러가 소유한다.
- 인덱스 부재는 예외가 아니라 결과 필드다. `error` 를 담은 객체로 재색인 방법을 알린다.
- 재색인을 실행하지 않고 볼트에 쓰지 않는다 — 의존은 `handleKgSearch` 와 `computeEffectiveLayers` 둘뿐이다.

## API Contracts

- `handleLensSearch(graph: KnowledgeGraph | null, input: LensSearchInput, vaultLayers: number[]): Promise<Record<string, unknown>>` — 랭크된 참조 목록. `vaultLayers` 는 해석된 볼트의 layer 상한.
- `LensSearchInput` — `seed`(필수, 서버 스키마가 최소 1개를 보장), `vault`·`max_results`·`decay`·`threshold`·`max_hops`·`layer_filter`·`sub_layer`(선택).
- `max_results`·`decay`·`threshold`·`max_hops` 는 기본값을 여기서 정하지 않는다. 미지정이면 `undefined` 그대로 넘어가 maencof 기본값이 적용된다.
- `graph` 가 `null` 이거나 maencof 결과에 `error` 가 있으면 `{ error: "Vault index not available. Run kg_build in a maencof session." }` 를 돌려준다.

## Acceptance Criteria

### AC-layer-ceiling — 레이어 상한 적용

- `layer_filter` 가 볼트 상한 밖 레이어를 포함하면 상한 안 레이어만 maencof 핸들러에 전달된다.
- `layer_filter` 를 생략하면 볼트 상한 전체가 전달된다.
- 교집합이 비면 throw 없이 볼트 상한 전체로 되돌아간다.

### AC-seed-passthrough — 시드 무변형 전달

- 입력 `seed` 배열이 항목 수·순서·내용 그대로 maencof 핸들러에 도달한다.
- 선택 파라미터를 생략하면 기본값이 주입되지 않고 `undefined` 로 전달된다.

### AC-index-absent — 인덱스 부재 보고

- `graph` 가 `null` 이면 throw 하지 않고 `error` 필드가 담긴 객체가 나온다.
- 그 문장이 재색인 수단을 지목한다.

## Last Updated

2026-07-30 — 레이어 상한 적용과 시드 무변형 전달 계약을 문서화했다.
