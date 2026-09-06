# hooks (plugin mapping) contract

## Requirements

- Claude Code 플러그인의 자동 실행 계층 매핑을 담는 canonical 설정 노드다.
- 3개 lifecycle 이벤트의 4개 진입점을 `bridge/*.mjs` 스크립트에 매핑한다.
- 이 디렉터리는 설정 자산이며 코드 모듈이 아니다. 진입점을 갖지 않는다.
- `hooks.json`은 손편집 대상이다. host별 파생 매니페스트는 plugin-compiler가 생성한다.

## API Contracts

- `hooks.json` — 이벤트명 → matcher → command·timeout 매핑.

## Acceptance Criteria

### AC-hookmap-events — 세 이벤트와 네 진입점

- SessionStart, UserPromptSubmit, PreToolUse만 등록되며 각 command가 `bridge/`의 실제 번들을 가리킨다.
- PreToolUse에는 일반 Read/Write/Edit 검증과 모든 tool에서 `agent_type`을 확인하는 review actor guard가 각각 등록된다.

## Last Updated

2026-09-07 — plugin agent inline hook을 대체하는 전역 review actor guard 매핑을 계약했다.
