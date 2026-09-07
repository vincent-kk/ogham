# fractalInspect — read-only inspection dispatcher

## Purpose

FCA tree, 구조 규칙, verification 문서와 owner chain 검사를 `fractal_inspect`의 명시적 action으로 라우팅한다.

## Conventions

- 모든 action은 read-only이며 기존 snapshot-backed child 계약을 보존한다.
- `action`은 정확히 한 child entry point를 선택한다.
- action마다 다른 detail 값은 strict input union에서 좁힌다.

## Boundaries

### Always do

- child fractal은 named entry point를 통해서만 호출
- exact·indeterminate·unsupported evidence와 diagnostics 보존
- resolve batch의 요청 순서와 cardinality 유지

### Ask first

- action 집합, detail projection 또는 validation scope 변경

### Never do

- child 구현 파일 직접 import
- 여러 action 결과를 하나의 암묵적 audit payload로 합치기
- project source나 config 수정
