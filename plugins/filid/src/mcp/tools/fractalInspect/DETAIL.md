# fractal_inspect — Filid 1.0 Contract

## Requirements

- `scan`, `validate`, `verification`, `resolve` action만 허용한다.
- 모든 action은 project path를 요구하고 project source와 config를 변경하지 않는다.
- action별 기존 도구의 summary, data, diagnostics와 status 의미를 보존한다.
- resolve는 top-level scalar target 필드를 거부하고 하나 이상의 ordered request를 받는다.

## API Contracts

| Action         | Input                                         | Delegation               | Payload                                  |
| -------------- | --------------------------------------------- | ------------------------ | ---------------------------------------- |
| `scan`         | `path`, `maxDepth?`, `detail?`, `nameFilter?` | tree-scan child          | tree summary + requested projection      |
| `validate`     | `path`, `scopes?`                             | project validation child | project-mode summary + validation report |
| `verification` | `path`, `filePaths?`, `detail?`               | verification child       | role summary + optional file evidence    |
| `resolve`      | `path`, `requests`                            | context-resolution child | bounded batch summary + ordered results  |

## Acceptance Criteria

### AC-fractal-inspect-dispatch — action별 단일 위임

- 각 action은 정확히 한 child entry point를 호출한다.
- validate는 plan mode 필드 없이 project validation만 수행한다.

### AC-fractal-inspect-payload — 기존 payload 보존

- action을 제외한 입력과 child 결과가 기존 inspection 도구 계약과 동일하다.
- resolve의 strict top-level 입력과 `requests` 최소 길이를 유지한다.

## Last Updated

2026-09-05
