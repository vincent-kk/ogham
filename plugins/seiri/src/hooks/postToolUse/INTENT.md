# postToolUse — Bash 실패 연쇄 신호

## Purpose

같은 셸 명령이 초록을 한 번도 못 본 채 연달아 실패하면 **한 줄 제안**을
주입한다. 그뿐이다 — 차단하지 않고, 실패를 해석하지 않는다.

## Structure

- `postToolUse.ts` — `processBashOutcome` (게이팅 + 카운트 + 문구)
- `postToolUse.entry.ts` — esbuild 번들 진입점 (`bridge/post-tool-use.mjs`)

## Conventions

- **이벤트 2개에 등록된다.** 비-0 종료는 `PostToolUseFailure`, 0 종료는
  `PostToolUse` 로 온다(실측). 앞은 세고 뒤는 잊는다 — 초록을 본 순간
  연쇄가 아니게 되므로.
- 실패 페이로드에는 `tool_response` 가 없다. 신호는 `error` 문자열과
  `is_interrupt` 로 온다. 사용자가 끊은 실행은 명령에 대해 아무것도
  말해주지 않으므로 세지 않는다.
- **다이얼이 먼저다.** advisory 면 상태를 건드리기 전에 빠져나온다 — 카운터
  파일조차 만들지 않는다.
- 문구는 fail-first 를 **본문에서 인정한다.** 의도된 red 와 안 먹는 fix 는
  페이로드상 구분 불가라, 구분하는 척하지 않고 양쪽을 다 말한다.
- 명령당 세션 1회만 말한다. 반복은 제안을 잔소리로 만든다.
- 카운트·상태는 `core/sessionSignals` 소관. 여기는 판정 문구만 갖는다.

## Boundaries

### Always do

- 어떤 실패에도 `{ continue: true }` — 매 셸 명령마다 도는 훅이다.
- 새 문구·새 조건 전에 "의도된 red 를 오발화시키는가"를 먼저 답할 것.

### Ask first

- 임계값 변경 (`constants/signals.ts`).
- matcher 확대 (Bash 외 도구).

### Never do

- `decision` 제어·차단 반환. 신호는 제안이다.
- 명령 원문·stderr 를 주입 문구에 넣기 — 모델은 이미 그 결과를 봤다.
- 배럴 import — 번들이 무거워진다.

## Dependencies

- `../../core/infra/configLoader/loaders/loadIntervention.js` (concrete)
- `../../core/sessionSignals/record/` (concrete), `../../constants/`
