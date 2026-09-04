# postToolUse — Contract

## Requirements

- Claude에서는 `Bash`·`Skill`과 `PostToolUse`·`PostToolUseFailure`를 다룬다. plugin compiler는 Codex 전용 manifest에서 지원하지 않는 Failure 이벤트와 `Skill` matcher를 제거하므로 비활성 그룹이 남지 않는다.
- Claude는 성공을 stdout/stderr 객체로 보내므로 정규화된 exit는 0이며, 실패는 `error`·`is_interrupt`로 보낸다. Codex는 성공과 nonzero 모두 `PostToolUse`의 문자열 `tool_response`로 보내며 exit와 interrupt 필드를 주지 않는다.
- **다이얼이 먼저다.** off 는 모든 상태 접근 전에 skip하고, advisory 는 원장·세션 상태를 건드리기 전에 빠져나온다.
- `Skill` 로드는 관측만 한다 — 마지막 워크플로우 상태만 기록하고 무주입으로 빠진다. 말하는 건 다음 턴의 몫이다.
- Bash 페이로드를 먼저 `{ text, exit?, interrupted? }`로 정규화한다. `interrupted === true`면 원장 판정과 실패 카운트를 모두 생략한다.
- 게이트는 이벤트 이름이나 exit가 아니라 출력 텍스트의 EXPECT 매치로만 판정한다. EXPECT 없음은 `unjudgeable`, 빈 출력은 `unmet — no output`, 불일치는 고정 사유의 `unmet`이며 알려진 nonzero exit는 이유와 증거에만 붙는다. 불일치 판정 줄은 저장소가 쓴 EXPECT 원문을 복제하지 않는다.
- 이미 met인 증거가 다시 met이 아니면 체크를 되돌리고 `pending (regressed)`를 기록한다. `agent_id`가 있는 증거는 짧은 표지를 남기며, 이후 드라이버 증명이 그 표지를 지운다.
- CHECK와 무관한 Bash는 기존 실패 연쇄를 따른다. CHECK 실패가 임계에 닿으면 별도 줄 대신 판정 줄 하나에 trace-cause 힌트를 합친다.
- 실패 연쇄는 명시적 failure 이벤트, 알려진 exit, CHECK 판정 순으로 실패 여부를 정한다. 앞의 두 근거가 없으면 `unmet`은 실패, 하나 이상의 판정이 모두 `met`이면 성공이며, 판정 불가능하면 카운터를 건드리지 않는다. 출력 내용에서 별도 실패 패턴을 추측하지 않는다.
- 원장 판정 실패는 CHECK 불일치처럼 fail-open 한다. 원장 기록 뒤 세션 신호 저장이 실패해도 이미 생긴 판정은 반환한다.
- 명령당 세션 1회만 말한다. 반복은 제안을 잔소리로 만든다.
- 문구는 fail-first 를 본문에서 인정한다. 의도된 red 와 안 먹는 fix 는 페이로드상 구분할 수 없으므로 구분하는 척하지 않는다.
- 명령 원문과 stderr 를 주입 문구에 넣지 않는다 — 모델은 이미 그 결과를 봤다.
- 카운트와 상태는 `core/sessionSignals` 소관이다. 여기는 판정 문구만 갖는다.

## API Contracts

- `processToolOutcome(...)` — off 게이팅 → advisory 게이팅 → 도구 분기 → 카운트·관측. 어떤 실패에도 `{ continue: true }`; 무주입 wire stdout은 entry가 생략한다.

## Acceptance Criteria

### AC-failure-chain — 실패 연쇄 판정

- 같은 명령이 초록 없이 임계 횟수 연달아 실패하면 한 줄 제안이 주입된다.
- 성공이 끼면 카운터가 초기화된다.
- `is_interrupt` 실행은 세지 않는다.
- failure 이벤트와 exit가 없는 Codex CHECK 호출은 `unmet`을 실패로 세고 모든 판정이 `met`이면 성공으로 초기화한다.
- CHECK와 일치하지 않거나 `unjudgeable`인 호출은 기존 카운터를 세거나 초기화하지 않는다.

### AC-skill-observation-only — 관측 전용

- Claude의 `Skill` 이벤트가 주입 없이 상태 기록만 남긴다. Codex에는 관측 가능한 Skill 도구가 없다.
- Claude 정본에는 `Skill` matcher가 유지되고 생성된 Codex manifest에는 그 matcher가 없다.

### AC-once-per-command — 반복 억제

- 같은 명령에 대해 세션당 한 번만 말한다.

### AC-advisory-silence — 다이얼 게이팅

- off 에서 config 이외의 상태를 읽거나 쓰지 않고 wire stdout도 남기지 않는다.
- advisory 에서 상태 파일에 쓰지 않고 주입도 하지 않는다.

### AC-gates-verdict-never-silent — 판정은 침묵하지 않는다

- standard 이상에서 CHECK와 일치한 호출은 원장 변경 여부와 관계없이 정확히 한 판정 줄을 받는다.
- 여러 작업과 실패 연쇄 힌트도 그 한 줄에 합친다.
- 같은 출력 텍스트와 EXPECT는 Claude 객체·실패 error·Codex 문자열 어느 형태에서도 같은 판정과 원장 바이트를 만든다.
- 불일치 판정 줄에는 EXPECT 원문이 포함되지 않는다.

### AC-gates-evidence-provenance — 증거 출처

- 게이트 증거는 호스트 페이로드에서 정규화한 출력 텍스트에서만 기록한다.
- 서브에이전트 증거는 짧은 agent 표지를 가지며 이후 드라이버 증명이 제거한다.

### AC-gates-dial — 게이트 다이얼

- advisory 에서는 작업 원장을 읽거나 쓰지 않고, 판정 줄도 주입하지 않는다.

## History

- 2026-09-05 — unmet 판정 줄에서 EXPECT 원문을 제거했다. 프로젝트가 작성한 임의 문자열을 훅 `additionalContext`로 되돌려 보내지 않으면서 판정 결과는 유지하기 위해서다.

## Last Updated

2026-09-05 — unmet 판정 줄에서 저장소 EXPECT 원문을 제거했다.
