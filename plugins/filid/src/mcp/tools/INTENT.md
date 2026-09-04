# tools — four-tool protocol handlers

## Purpose

Filid 1.0의 setup/inspection/restructure/review 동작을 정확히 4개 독립 sub-fractal로 노출한다.

## Structure

| Tool fractal     | Role                                          |
| ---------------- | --------------------------------------------- |
| `projectSetup`   | 초기화, managed rules와 설정 session dispatch |
| `fractalInspect` | FCA tree, rule, verification와 context 검사   |
| `restructure`    | placement plan과 사전·사후조건 검증           |
| `reviewState`    | merge-track review lifecycle                  |
| `utils/`         | shared host guards와 진단 scoping             |

## Conventions

- 각 handler는 core 공개 entry point를 오케스트레이션한다.
- 고정 input/status/detail/action 값은 constants object enum을 사용한다.
- MCP 출력은 server의 16 KiB artifact envelope를 통과한다.

## Boundaries

### Always do

- tool마다 INTENT, DETAIL, named barrel과 단일 `handle*` runtime export 유지
- project source를 읽기 전 normalized root와 snapshot을 한 번만 생성
- dispatcher 부모는 child의 named entry point만 import

### Ask first

- 4개 목록, action/input schema, persistence 또는 status 의미 변경

### Never do

- 범용 AST/search/edit, file move, import rewrite 또는 review fix 추가
- 형제 fractal 사이 직접 import
- dispatcher에서 child 구현 파일 직접 import
- core 판단을 MCP handler에 복제

## Dependencies

- `../../core/`, `../../adapters/`, `../../types/`, `../../constants/`
