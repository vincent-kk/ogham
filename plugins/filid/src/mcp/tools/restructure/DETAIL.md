# restructure — Filid 1.0 Contract

## Requirements

- `plan`, `precondition`, `postcondition` action만 허용한다.
- plan은 같은 snapshot에서 placement evidence를 계산하고 크기와 무관하게 ephemeral artifact로 저장한다.
- validation은 absolute `planPath`의 common payload 또는 bare plan을 read-only로 검사한다.
- project source와 plan artifact를 수정하지 않는다.
- 세 action의 summary는 status와 결과로 고른 다음 단계 `nextAction`을 싣는다: 실행 절차, `decisions`·진단·finding의 `nextAction`을 따를 것, 또는 완료 보고. graph가 `unsupported`인 plan은 진단보다 먼저 status `unsupported`로 정한다.
- plan summary는 `alreadyPlacedCount`와 `delegatedImportCount`를 싣는다.
- plan artifact 읽기 실패는 `plan-path-not-absolute`, `plan-artifact-not-found`, `plan-artifact-invalid`(다른 schema version 포함) 코드의 `ToolDiagnosticError`다.

## API Contracts

| Action          | Input              | Delegation              | Payload                                   |
| --------------- | ------------------ | ----------------------- | ----------------------------------------- |
| `plan`          | `path`, `requests` | placement-plan handler  | plan summary + `persistence: always` data |
| `precondition`  | `path`, `planPath` | plan-validation handler | precondition summary + validation result  |
| `postcondition` | `path`, `planPath` | plan-validation handler | postcondition summary + validation result |

## Acceptance Criteria

### AC-restructure-dispatch — action별 단일 위임

- plan은 planner를 한 번 호출하고 validation action은 대응 core validator를 한 번 호출한다.
- validation action은 missing, relative 또는 invalid artifact를 코드와 `nextAction`을 가진 trust-boundary error로 거부한다.

### AC-restructure-payload — 기존 payload 보존

- plan의 summary, data, diagnostics와 always-persist 의미를 유지한다.
- validation의 mode, snapshot hash, finding count와 result를 유지한다.

### AC-restructure-next-action — summary 다음 단계

- plan ok, plan unresolved, postcondition ok, postcondition violations는 각자 다른 summary `nextAction`을 낸다.
- adapter가 없어 graph가 `unsupported`인 plan은 진단이 있어도 status `unsupported`다.

### AC-restructure-scopes — plan validation 범위

- precondition과 postcondition summary의 `scopes`는 입력 echo가 아니라 canonical 여섯 scope 전체다.
- plan validation input은 `scopes`를 받지 않는다.

## History

- 2026-09-19 — 응답 summary와 plan artifact 오류에 다음 단계를 붙였다. 호출자가 여러 단계로 된 절차의 다음 호출을 스킬 문서에서 추측해야 했다. adapter 없는 프로젝트가 진단 때문에 `indeterminate`로만 보고되어 `unsupported` 판정이 도달하지 않던 순서도 바꿨다.

## Last Updated

2026-09-19
