# postToolUse — Contract

## Requirements

- Claude에서는 `Bash`·`Skill`과 `PostToolUse`·`PostToolUseFailure`를 다룬다. Codex 전용 manifest는 지원하지 않는 Failure 이벤트를 빼며 Skill 도구 자체가 없어 그 관측 경로가 발화하지 않는다.
- Claude는 성공을 stdout/stderr 객체로 보내므로 정규화된 exit는 0이며, 실패는 `error`·`is_interrupt`로 보낸다. Codex는 성공과 nonzero 모두 `PostToolUse`의 문자열 `tool_response`로 보내며 exit와 interrupt 필드를 주지 않는다.
- **다이얼이 먼저다.** advisory 면 상태를 건드리기 전에 빠져나온다.
- `Skill` 로드는 관측만 한다 — 마지막 워크플로우 상태만 기록하고 무주입으로 빠진다. 말하는 건 다음 턴의 몫이다.
- Bash 페이로드를 먼저 `{ text, exit?, interrupted? }`로 정규화한다. `interrupted === true`면 원장 판정과 실패 카운트를 모두 생략한다.
- 게이트는 이벤트 이름이나 exit가 아니라 출력 텍스트의 EXPECT 매치로만 판정한다. EXPECT 없음은 `unjudgeable`, 빈 출력은 `unmet — no output`, 불일치는 `unmet`이며 알려진 nonzero exit는 이유와 증거에만 붙는다.
- 이미 met인 증거가 다시 met이 아니면 체크를 되돌리고 `pending (regressed)`를 기록한다. `agent_id`가 있는 증거는 짧은 표지를 남기며, 이후 드라이버 증명이 그 표지를 지운다.
- CHECK와 무관한 Bash는 기존 실패 연쇄를 따른다. CHECK 실패가 임계에 닿으면 별도 줄 대신 판정 줄 하나에 trace-cause 힌트를 합친다.
- 실패 연쇄는 호스트가 주는 성공/실패 이벤트를 사용한다. Codex에는 실패 표지가 없어 nonzero도 연쇄상 성공처럼 초기화되는 허용 차이이며, 출력 내용으로 실패를 추측하지 않는다.
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

- Claude의 `Skill` 이벤트가 주입 없이 상태 기록만 남긴다. Codex에는 관측 가능한 Skill 도구가 없다.

### AC-once-per-command — 반복 억제

- 같은 명령에 대해 세션당 한 번만 말한다.

### AC-advisory-silence — 다이얼 게이팅

- advisory 에서 상태 파일에 쓰지 않고 주입도 하지 않는다.

### AC-gates-verdict-never-silent — 판정은 침묵하지 않는다

- standard 이상에서 CHECK와 일치한 호출은 원장 변경 여부와 관계없이 정확히 한 판정 줄을 받는다.
- 여러 작업과 실패 연쇄 힌트도 그 한 줄에 합친다.
- 같은 출력 텍스트와 EXPECT는 Claude 객체·실패 error·Codex 문자열 어느 형태에서도 같은 판정과 원장 바이트를 만든다.

### AC-gates-evidence-provenance — 증거 출처

- 게이트 증거는 호스트 페이로드에서 정규화한 출력 텍스트에서만 기록한다.
- 서브에이전트 증거는 짧은 agent 표지를 가지며 이후 드라이버 증명이 제거한다.

### AC-gates-dial — 게이트 다이얼

- advisory 에서는 작업 원장을 읽거나 쓰지 않고, 판정 줄도 주입하지 않는다.

## Last Updated

2026-08-23 — 출력 텍스트와 EXPECT만으로 판정하는 호스트 패리티 계약을 반영했다.
