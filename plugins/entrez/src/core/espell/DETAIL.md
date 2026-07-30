# espell — Contract

## Requirements

- 재시도 판단과 교정 해석을 분리한다. 판단은 순수 함수이고, 네트워크는 `EspellFn` 으로 주입한다.
- 교정으로 인정하는 조건은 두 가지다: 비어 있지 않을 것, 원문과 다를 것. 그 밖에는 `hasCorrection: false` 다.
- union 결과가 0 이거나 저조하거나 spelling warning 이 있을 때만 재시도를 고려한다.

## API Contracts

- `shouldRespell(params: ShouldRespellParams): boolean` — 재시도 여부 판단(순수).
- `runEspell(...)` — 주입된 `EspellFn` 으로 교정을 조회하고 결과를 해석한다.

## Acceptance Criteria

### AC-respell-trigger — 재시도 조건

- 결과 0건 또는 spelling warning 이 있을 때 재시도를 제안한다.
- 충분한 결과가 있고 경고도 없으면 재시도하지 않는다.

### AC-correction-validity — 교정 인정

- 빈 교정어는 교정으로 인정하지 않는다.
- 원문과 같은 교정어도 인정하지 않는다.

## Last Updated

2026-07-30 — 철자 교정 전처리 계약을 문서화했다.
