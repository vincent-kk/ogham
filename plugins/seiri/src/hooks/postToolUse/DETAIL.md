# postToolUse — Contract

## Requirements

- 도구 2종·이벤트 2개를 다룬다. matcher 는 `Bash`·`Skill` 이며 정본은 `HostTool`, wiring 테스트가 `hooks.json` 과 대조한다.
- 비-0 종료는 `PostToolUseFailure`, 0 종료는 `PostToolUse` 로 온다 — 앞은 세고 뒤는 잊는다.
- 사용자가 끊은 실행(`is_interrupt`)은 명령에 대해 말해주는 게 없으므로 세지 않는다. 실패 페이로드에는 `tool_response` 가 없고 신호는 `error`·`is_interrupt` 로 온다.
- **다이얼이 먼저다.** advisory 면 상태를 건드리기 전에 빠져나온다.
- `Skill` 로드는 관측만 한다 — 마지막 워크플로우 상태만 기록하고 무주입으로 빠진다. 말하는 건 다음 턴의 몫이다.
- Bash 명령을 검증하고 `is_interrupt`면 원장 판정과 실패 카운트를 모두 생략한다. 그 뒤 CHECK 판정, 성공 카운터 초기화 또는 실패 카운트 순으로 처리한다.
- exit 0은 `tool_response.stdout`·`stderr` 문자열을 합쳐 EXPECT를 판정한다. 비-0은 `error`와 그 안의 `Exit code N`만 관측하며, exit 코드 외 본문이 없으면 stdout 비관측으로 원장을 바꾸지 않는다.
- 판정은 exit 0 증명·불일치, 비-0 stderr 증명·불일치, unobservable의 다섯 경우다. 같은 CHECK를 가진 여러 작업도 한 호출에 한 줄만 주입한다.
- 이미 met인 증거가 더는 맞지 않으면 체크를 되돌리고 `pending (regressed)`를 기록한다. `agent_id`가 있는 증거는 짧은 표지를 남기며, 이후 드라이버 증명이 그 표지를 지운다.
- CHECK와 무관한 Bash는 기존 실패 연쇄를 따른다. CHECK 실패가 임계에 닿으면 별도 줄 대신 판정 줄 하나에 trace-cause 힌트를 합친다.
- 원장 판정 실패는 CHECK 불일치처럼 fail-open 한다. 원장 기록 뒤 세션 신호 저장이 실패해도 이미 생긴 판정은 반환한다.
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

### AC-gates-verdict-never-silent — 판정은 침묵하지 않는다

- standard 이상에서 CHECK와 일치한 호출은 원장 변경 여부와 관계없이 정확히 한 판정 줄을 받는다.
- 여러 작업과 실패 연쇄 힌트도 그 한 줄에 합친다.

### AC-gates-evidence-provenance — 증거 출처

- 게이트 증거는 성공의 stdout·stderr 또는 실패의 error에서만 기록한다.
- 서브에이전트 증거는 짧은 agent 표지를 가지며 이후 드라이버 증명이 제거한다.

### AC-gates-dial — 게이트 다이얼

- advisory 에서는 작업 원장을 읽거나 쓰지 않고, 판정 줄도 주입하지 않는다.

## Last Updated

2026-08-22
