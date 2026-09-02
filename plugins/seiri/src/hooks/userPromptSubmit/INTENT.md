# userPromptSubmit — 매 턴 스킬 발동 · 원장 상기

## Purpose

매 사용자 턴이 시작될 때 스킬 발동 상기를 주입하고, 미충족 작업 원장이 있으면 모든 작업을 **한 줄 원장 상기**로 덧붙인다. 차단하지 않고, 스킬 축과 아직 끝나지 않은 실행 책임을 세션 교체 너머로 나른다.

## Structure

- `userPromptSubmit.ts` — `processUserPromptSubmit` (게이팅 + 문구 + 상태·원장 상기)
- `userPromptSubmit.entry.ts` — `bridge/user-prompt-submit.mjs` 번들 진입점

## Conventions

- **다이얼이 먼저다.** off 면 모든 상태 접근 전에 skip하고, advisory 면 workflow 상태를 읽지 않고 주입 없이 빠져나온다.
- **상태 1절은 로드 뒤 한 턴만.** `consumeWorkflowState` 가 1회 소비하고, 읽기·쓰기 실패는 상기만 남긴 채 조용히 지나간다(fail-open).
- **원장은 작업 수와 무관하게 한 줄이다.** 미충족 원장이 있을 때만 워크플로우 상태 뒤에 붙고, 전부 충족되거나 조회가 실패하면 생략한다.
- **단계별로 문구가 다르다.** standard 는 선출 어휘 + `/seiri:verify` 하나, strict 는 전 순간을 이름으로 댄다. 정본은 `constants/turnReminders.ts` (`TURN_REMINDER_STANDARD` · `TURN_REMINDER_STRICT`).
- **스킬 축이 앞선다.** 이 훅이 닫는 실패는 "순간이 왔는데 스킬이 안 떴다" 이므로 순간→스킬을 먼저 대고 규칙 상기를 뒤에 싣는다. 프롬프트 본문은 안 읽는다.
- 규칙 본문은 복제하지 않는다. strict 가 순간→스킬 사슬을 되풀이하는 것은 의도다 — 컴팩션이 SessionStart 를 떨구는 자리가 바로 매 턴이다.

## Boundaries

### Always do

- 어떤 실패에도 processor는 `{ continue: true }`, 무주입 entry stdout은 빈 문자열 — 매 턴 도는 훅이다.
- 문구 변경은 `constants/turnReminders.ts` 에서. 여기는 선택·주입만.

### Ask first

- matcher 확대나 발화 조건 변경.
- 주입 길이 증가 — 매 턴 비용이다.

### Never do

- `decision` 제어·차단 반환. 상기는 제안이다.
- 규칙 본문 복제 — 하니스가 이미 로드했다.
- 배럴 import — 번들이 무거워진다.

## Dependencies

- `../../core/gates/` — 번들 상한 때문에 원장 조회·상태 계산·한 줄 렌더만 각 organ에서 concrete import 한다(면제 근거는 gates DETAIL).
