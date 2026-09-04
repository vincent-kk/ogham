# restructure — Filid 1.0 Contract

## Requirements

- `plan`, `precondition`, `postcondition` action만 허용한다.
- plan은 같은 snapshot에서 placement evidence를 계산하고 크기와 무관하게 ephemeral artifact로 저장한다.
- validation은 absolute `planPath`의 common payload 또는 bare plan을 read-only로 검사한다.
- project source와 plan artifact를 수정하지 않는다.

## API Contracts

| Action | Input | Delegation | Payload |
| --- | --- | --- | --- |
| `plan` | `path`, `requests` | placement-plan handler | plan summary + `persistence: always` data |
| `precondition` | `path`, `planPath` | plan-validation handler | precondition summary + validation result |
| `postcondition` | `path`, `planPath` | plan-validation handler | postcondition summary + validation result |

## Acceptance Criteria

### AC-restructure-dispatch — action별 단일 위임

- plan은 planner를 한 번 호출하고 validation action은 대응 core validator를 한 번 호출한다.
- validation action은 missing, relative 또는 invalid artifact를 trust-boundary error로 거부한다.

### AC-restructure-payload — 기존 payload 보존

- plan의 summary, data, diagnostics와 always-persist 의미를 유지한다.
- validation의 mode, snapshot hash, finding count와 result를 유지한다.

### AC-restructure-scopes — plan validation 범위

- precondition과 postcondition summary의 `scopes`는 입력 echo가 아니라 canonical 여섯 scope 전체다.
- plan validation input은 `scopes`를 받지 않는다.

## Last Updated

2026-09-05
