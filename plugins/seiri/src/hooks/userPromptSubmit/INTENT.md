# userPromptSubmit — 매 턴 스킬 발동 상기

## Purpose

매 사용자 턴이 시작될 때 **한 줄 상기**를 주입한다. SessionStart 는 세션 머리에서 한 번 자세를 말하지만, 긴 세션은 그것을 밀어내고 컴팩션은 아예 떨군다 — 스킬이 떠야 할 순간이 곧 그 자세가 사라진 순간이다. 여기서 그 핵심을 매 턴 되살린다. 차단하지 않고, 스킬 축을 앞세운다.

## Structure

- `userPromptSubmit.ts` — `processUserPromptSubmit` (게이팅 + 문구 + 상태 1절)
- `userPromptSubmit.entry.ts` — `bridge/user-prompt-submit.mjs` 번들 진입점

## Conventions

- **다이얼이 먼저다.** advisory 면 상태도 안 읽고 주입 없이 빠져나온다.
- **상태 1절은 로드 뒤 한 턴만.** `consumeWorkflowState` 가 1회 소비하고, 읽기·쓰기 실패는 상기만 남긴 채 조용히 지나간다(fail-open).
- **단계별로 문구가 다르다.** standard 는 선출 어휘 + `/seiri:verify` 하나, strict 는 전 순간을 이름으로 댄다. 정본은 `constants/turnReminders.ts` (`TURN_REMINDER_STANDARD` · `TURN_REMINDER_STRICT`).
- **스킬 축이 앞선다.** 이 훅이 닫는 실패는 "순간이 왔는데 스킬이 안 떴다" 이므로 순간→스킬을 먼저 대고 규칙 상기를 뒤에 싣는다. 프롬프트 본문은 안 읽는다.
- 규칙 본문은 복제하지 않는다. strict 가 순간→스킬 사슬을 되풀이하는 것은 의도다 — 컴팩션이 SessionStart 를 떨구는 자리가 바로 매 턴이다.

## Boundaries

### Always do

- 어떤 실패에도 `{ continue: true }` — 매 턴 도는 훅이다.
- 문구 변경은 `constants/turnReminders.ts` 에서. 여기는 선택·주입만.

### Ask first

- matcher 확대나 발화 조건 변경.
- 주입 길이 증가 — 매 턴 비용이다.

### Never do

- `decision` 제어·차단 반환. 상기는 제안이다.
- 규칙 본문 복제 — 하니스가 이미 로드했다.
- 배럴 import — 번들이 무거워진다.

## Dependencies

- `../../core/infra/configLoader/loaders/loadIntervention.js` (concrete)
- `../../constants/` (plugin · hooks · turnReminders · workflowStateLines)
