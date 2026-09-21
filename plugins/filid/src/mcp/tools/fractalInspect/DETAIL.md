# fractal_inspect — Filid 1.0 Contract

## Requirements

- `scan`, `validate`, `verification`, `resolve` action만 허용한다.
- 모든 action은 project path를 요구하고 project source와 config를 변경하지 않는다.
- action별 기존 도구의 summary, data, diagnostics와 status 의미를 보존한다.
- resolve는 top-level scalar target 필드를 거부하고 하나 이상의 ordered request를 받는다.
- `scan`의 summary는 `filesOutsideFactsScope`를 싣는다 — 선언된 facts 범위가 빼서 어떤 참조 기반 규칙도 적용되지 않은 **소스** 파일 수이며, 0일 때도 싣는다. 세는 식은 **기본 범위(adapter 소스 확장자)가 덮었을 파일 중 선언된 범위(`facts.covers`·`facts.excludes`)가 뺀 것**이다 — 문서·설정 파일처럼 애초에 참조 사실의 대상이 아닌 파일까지 세면 설정 없는 모든 프로젝트에서 0이 아니게 되어 읽는 쪽이 건너뛰는 상시 문장이 된다. 선언된 한계: 기본 확장자 밖 언어는 `facts.covers`로 선언해야 범위에 들어오고, 선언하지 않은 그런 파일은 이 개수에 들지 않는다. 보고서가 "검증했다"와 "그 중 N개는 보지 않았다"를 함께 말하게 하는 값이고, 결론을 바꾸지 않으므로 진단도 hash 입력도 아니다.

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
