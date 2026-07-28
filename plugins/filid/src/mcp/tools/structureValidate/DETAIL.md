# structure_validate — Filid 1.0 Contract

## Requirements

- `project`, `plan-precondition`, `plan-postcondition` mode만 허용한다.
- project mode는 선택된 FCA scope의 canonical rule만 같은 snapshot에 평가한다.
- plan mode는 `planPath`의 read-only JSON artifact를 core validator에 전달한다.
- plan mode는 common envelope가 저장한 full `ToolPayload`의 `.data`를 읽고,
  기존 bare-plan artifact도 같은 schema로 읽는 호환성을 유지한다.
- finding, snapshot diagnostic와 non-exact certainty를 status에 보존한다.
- project source와 plan artifact를 수정하지 않는다.

## API Contracts

- Input: `{ path, mode?, scopes?, planPath? }`.
- scopes는 documents, nodes, entry-points, boundaries, dag, verification이다.
- plan mode에는 `planPath`가 필수이며 project root 밖 artifact도 읽을 수 있지만
  JSON, payload data와 plan schema가 유효해야 한다.
- Output은 mode, snapshot hash, 검사/finding 수의 summary와 optional findings
  data를 가진 공통 tool envelope다.

## Acceptance Criteria

### AC-validate-project — Scoped project rules

- 생략 scope는 전체 canonical rule을 실행하고 지정 scope만 정확히 필터한다.
- violation 또는 indeterminate evidence는 `ok`가 아니다.

### AC-validate-plan — Exact execution contract

- stale snapshot, 남은 source, 잘못된 target/artifact/import/boundary/DAG를
  해당 core finding code로 반환한다.

## Last Updated

2026-07-27 — full payload 및 bare-plan artifact 호환을 포함한 read-only plan
pre/postcondition 계약.
