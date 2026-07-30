# postToolUse — Contract

## Requirements

- 도구 2종·이벤트 2개를 다룬다. matcher 는 `Bash`·`Skill` 이며 정본은 `HostTool`, wiring 테스트가 `hooks.json` 과 대조한다.
- 비-0 종료는 `PostToolUseFailure`, 0 종료는 `PostToolUse` 로 온다 — 앞은 세고 뒤는 잊는다.
- 사용자가 끊은 실행(`is_interrupt`)은 명령에 대해 말해주는 게 없으므로 세지 않는다. 실패 페이로드에는 `tool_response` 가 없고 신호는 `error`·`is_interrupt` 로 온다.
- **다이얼이 먼저다.** advisory 면 상태를 건드리기 전에 빠져나온다.
- `Skill` 로드는 관측만 한다 — 마지막 워크플로우 상태만 기록하고 무주입으로 빠진다. 말하는 건 다음 턴의 몫이다.
- 명령당 세션 1회만 말한다. 반복은 제안을 잔소리로 만든다.
- 문구는 fail-first 를 본문에서 인정한다. 의도된 red 와 안 먹는 fix 는 페이로드상 구분할 수 없으므로 구분하는 척하지 않는다.
- 명령 원문과 stderr 를 주입 문구에 넣지 않는다 — 모델은 이미 그 결과를 봤다.
- 카운트와 상태는 `core/sessionSignals` 소관이다. 여기는 판정 문구만 갖는다.

## API Contracts

- `processToolOutcome(...)` — 게이팅 → 도구 분기 → 카운트·관측. 어떤 실패에도 `{ continue: true }`.

## Acceptance Criteria

### AC-failure-chain — 실패 연쇄 판정

- 같은 명령이 초록 없이 임계 횟수 연달아 실패하면 한 줄 제안이 주입된다.
- 성공이 끼면 카운터가 초기화된다.
- `is_interrupt` 실행은 세지 않는다.

### AC-skill-observation-only — 관측 전용

- `Skill` 이벤트가 주입 없이 상태 기록만 남긴다.

### AC-once-per-command — 반복 억제

- 같은 명령에 대해 세션당 한 번만 말한다.

### AC-advisory-silence — 다이얼 게이팅

- advisory 에서 상태 파일에 쓰지 않고 주입도 하지 않는다.

## Last Updated

2026-07-30 — 실패 연쇄 신호와 관측 계약을 문서화했다.
