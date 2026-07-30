# lensRead — Contract

## Requirements

- `@ogham/maencof` 의 `handleMaencofRead` 를 감싸는 얇은 어댑터다. 다섯 툴 중 유일하게 그래프가 아니라 볼트 경로를 받아 호출한다 — 시그니처가 `handleMaencofRead(vaultPath, input)` 이라 인덱스 없이도 문서를 읽는다.
- 호출별 레이어 필터를 받지 않는다. `computeEffectiveLayers(vaultLayers, undefined)` 를 호출하므로 유효 레이어는 항상 볼트 설정 상한(기본 L2–L5)이다.
- 레이어 판정은 **본문 반환 전에** 끝난다. 결과의 `node.layer` 가 유효 레이어 밖이면 본문을 담지 않은 `error` 객체만 돌려준다 — 차단 대상 문서의 내용이 응답에 실리면 필터가 무의미하다.
- `node.layer` 가 없으면 통과시킨다. 레이어를 알 수 없다는 이유로 읽기를 막지 않는다.
- 차단 메시지는 어느 레이어라서 막혔는지를 담는다. 소비자가 설정을 고쳐야 할지 판단할 수 있어야 한다.
- 볼트에 쓰지 않는다 — 의존은 `handleMaencofRead` 와 `computeEffectiveLayers` 둘뿐이다.

## API Contracts

- `handleLensRead(input: LensReadInput, vaultPath: string, vaultLayers: number[]): Promise<Record<string, unknown>>` — 문서 읽기 결과 또는 차단 사유. `vaultPath` 는 해석된 볼트 루트, `vaultLayers` 는 그 볼트의 layer 상한.
- `LensReadInput` — `path`(필수, 볼트 기준 문서 경로), `vault`(선택). `layer_filter` 는 입력에 없다.
- 상한 밖 문서는 `{ error: "Document is in a restricted layer (L<n>)" }` 를 돌려준다. 서버는 이 `error` 필드를 `isError` 응답으로 승격한다 — 다섯 툴 중 이 승격을 받는 것은 `read` 뿐이다.
- 통과한 경우 maencof 결과 객체를 그대로 돌려준다.

## Acceptance Criteria

### AC-restricted-layer — 상한 밖 차단

- 유효 레이어 밖 문서를 요청하면 `error` 필드만 담긴 객체가 나온다.
- 그 응답에 문서 본문이 없다.
- 메시지에 차단된 레이어 번호가 포함된다.

### AC-missing-layer-passthrough — 레이어 미상 통과

- 결과 `node` 에 `layer` 가 없으면 차단하지 않고 원본 결과를 돌려준다.
- `node` 자체가 없어도 throw 하지 않는다.

### AC-read-only — 읽기 전용

- 이 경로에서 볼트에 쓰기가 없다.
- 그래프 인덱스를 만들거나 갱신하지 않는다.

## Last Updated

2026-07-30 — 레이어 차단 시점과 차단 응답 형태를 문서화했다.
