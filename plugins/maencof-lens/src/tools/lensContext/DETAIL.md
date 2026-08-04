# lensContext — Contract

## Requirements

- `@ogham/maencof` 의 `handleKgContext` 를 감싸는 얇은 어댑터다. 토큰 예산 산정·문서 조합 로직을 여기서 다시 만들지 않는다.
- 호출자가 준 `layer_filter` 를 그대로 넘기지 않는다. `computeEffectiveLayers(vaultLayers, input.layer_filter)` 결과만 maencof 핸들러에 전달해 볼트 설정 상한(기본 L2–L5)을 넘는 요청을 차단한다.
- 교집합이 비어도 에러로 만들지 않는다 — layerGuard 계약대로 볼트 상한 전체로 되돌아간다. 필터 오타가 조회 자체를 막는 것보다 낫다.
- 인덱스 부재는 예외가 아니라 결과 필드다. `error` 를 담은 객체를 돌려주고 재색인 방법(`kg_build` in a maencof session)을 문장으로 알린다.
- 재색인을 실행하지 않는다. 이 패키지는 읽기 전용이라 인덱스가 없으면 없다고 보고할 뿐이다.
- 볼트 파일시스템에 쓰지 않는다 — 의존은 `handleKgContext` 와 `computeEffectiveLayers` 둘뿐이다.
- `sub_layer`·`scope` 는 maencof 타입(`SubLayer`, `KgContextScope`)을 그대로 받아 통과시킨다. 값 검증은 서버 스키마와 maencof 핸들러가 소유한다.
- `include_content` 는 그대로 통과시킨다 — false 면 maencof 가 조립 markdown 없이 선택 문서 목록(`documents`)만 돌려주고, 호출자는 lens `read` 로 선별 조회한다.

## API Contracts

- `handleLensContext(graph: KnowledgeGraph | null, input: LensContextInput, vaultPath: string, vaultLayers: number[]): Promise<Record<string, unknown>>` — 조합된 컨텍스트 블록. `vaultLayers` 는 해석된 볼트의 layer 상한, `vaultPath` 는 문서 본문을 읽을 볼트 루트.
- `LensContextInput` — `query`(필수), `vault`·`token_budget`·`include_full`·`layer_filter`·`sub_layer`·`scope`·`include_content`(선택).
- `graph` 가 `null` 이거나 maencof 결과에 `error` 가 있으면 `{ error: "Vault index not available. Run kg_build in a maencof session." }` 를 돌려준다 — 원본 에러 문자열은 이 문장으로 대체된다.

## Acceptance Criteria

### AC-layer-ceiling — 레이어 상한 적용

- `layer_filter` 가 볼트 상한 밖 레이어를 포함하면 상한 안 레이어만 maencof 핸들러에 전달된다.
- `layer_filter` 를 생략하면 볼트 상한 전체가 전달된다.
- 교집합이 비면 throw 없이 볼트 상한 전체로 되돌아간다.

### AC-index-absent — 인덱스 부재 보고

- `graph` 가 `null` 이면 throw 하지 않고 `error` 필드가 담긴 객체가 나온다.
- 그 문장이 재색인 수단을 지목한다.

### AC-read-only — 읽기 전용

- 이 경로에서 볼트나 인덱스에 쓰기가 없다.
- 인덱스 부재를 감지해도 재색인을 트리거하지 않는다.

## Last Updated

2026-08-05 — `include_content`(경로-만 모드) 통과를 계약에 추가했다.
