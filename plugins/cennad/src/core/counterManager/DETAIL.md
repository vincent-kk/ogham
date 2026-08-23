# counterManager — Contract

## Requirements

- 세션 카운터 저장소로 provider(codex·antigravity·claude) 호출 횟수를 추적한다.
- 카운터는 MCP와 훅이 같이 관측하는 `CENNAD_HOST_SESSION_ID`를 우선하고, Claude에서는 `CLAUDE_PID`를 동일한 문자열 식별자로 정규화한다.
- 공통 식별자가 없으면 이전 값을 0으로 합성하지 않고 카운터 파일도 쓰지 않는다.
- 식별된 새 세션이 다른 세션의 기록을 만나면 0/0/0에서 새로 시작한다.
- 카운터 리셋은 이 모듈의 책임이다. 훅은 읽기만 한다.

## API Contracts

- 카운터 읽기 — 식별된 현재 세션의 provider 별 호출 수, 또는 식별 불가 상태.
- 카운터 증가·기록 — 식별된 세션에서만 `host_session_id`와 함께 저장한다.

## Acceptance Criteria

### AC-counter-session-isolation — 세션 격리

- 명시 식별자를 공유한 direct bundle과 `libs/run.cjs` 경유 bundle이 동일한 비영 카운트를 관측한다.
- 식별자가 없으면 카운트를 쓰지 않고 미측정 상태를 유지한다.
- 기존 `parent_pid`는 현재 `CLAUDE_PID`와 같은 경우에만 현재 세션 기록으로 읽힌다.

## Last Updated

2026-08-23 — 호스트 공통 식별자와 미식별 시 fail-closed 계약으로 전환했다.
