# fractal_inspect validate action — Filid 1.0 Contract

## Requirements

- 선택된 FCA scope의 canonical rule만 같은 snapshot에 평가한다.
- finding은 exact evidence 위에서도 `violations` status로 보존한다.
- 문서 계약 finding을 옮긴 diagnostic은 certainty를 낮추지 않으며, 그 밖의 snapshot diagnostic과 non-exact certainty는 `indeterminate` 또는 `unsupported` status로 보존한다.
- project source를 수정하지 않는다.

## API Contracts

- Input: `{ path, scopes? }`.
- scopes는 documents, nodes, entry-points, boundaries, dag, verification이다.
- Output은 `project` mode, snapshot hash, 검사/finding 수의 summary와 `ValidationReport` data를 가진 공통 tool envelope다.

## Acceptance Criteria

### AC-validate-project — Scoped project rules

- 생략 scope는 전체 canonical rule을 실행하고 지정 scope만 정확히 필터한다.
- violation 또는 indeterminate evidence는 `ok`가 아니다.
- `intent-document-contract`와 `detail-document-contract` diagnostic만 있고 finding이 있으면 `violations`이며 `indeterminate`가 아니다.

## History

- 2026-09-05 — plan 검증을 `restructure`로 분리하고 project 검증을 `fractal_inspect`의 `validate` action으로 이동했다.
- 2026-08-20 — 문서 계약 finding diagnostic과 불완전 evidence를 구분했다.

## Last Updated

2026-09-05
