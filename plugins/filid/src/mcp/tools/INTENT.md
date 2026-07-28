# tools — nine-tool protocol handlers

## Purpose

Filid 1.0의 project/config/scan/context/plan/validation/review 동작을 정확히
9개 독립 sub-fractal로 노출한다.

## Structure

| Tool fractal                                                  | Role              |
| ------------------------------------------------------------- | ----------------- |
| `projectInit`, `ruleDocsSync`, `openSettings`                  | 초기화와 설정     |
| `fractalScan`, `contextResolve`, `restructurePlan`             | FCA 증거와 계획   |
| `structureValidate`, `verificationScan`, `reviewState`         | 검증과 review 상태 |
| `utils/`                                                      | shared host guards |

## Conventions

- 각 handler는 core 공개 entry point를 오케스트레이션한다.
- 고정 input/status/detail/action 값은 constants object enum을 사용한다.
- MCP 출력은 server의 16 KiB artifact envelope를 통과한다.

## Boundaries

### Always do

- tool마다 INTENT, DETAIL, named barrel과 단일 `handle*` runtime export 유지
- project source를 읽기 전 normalized root와 snapshot을 한 번만 생성

### Ask first

- 9개 목록, input schema, persistence 또는 status 의미 변경

### Never do

- 범용 AST/search/edit, file move, import rewrite 또는 review fix 추가
- tool sub-fractal 사이 직접 import
- core 판단을 MCP handler에 복제

## Dependencies

- `../../core/`, `../../adapters/`, `../../types/`, `../../constants/`
