# userPromptSubmit — Contract

## Requirements

- 매 사용자 턴 시작에 한 줄 상기를 주입한다. SessionStart 의 자세는 긴 세션이 밀어내고 컴팩션이 떨구는데, 스킬이 떠야 할 순간이 곧 그 자세가 사라진 순간이기 때문이다.
- **다이얼이 먼저다.** advisory 면 상태도 읽지 않고 주입 없이 빠져나온다.
- 워크플로우 상태 1절은 로드 뒤 **한 턴만** 나온다. `consumeWorkflowState` 가 1회 소비하고, 읽기·쓰기 실패는 상기만 남긴 채 조용히 지나간다(fail-open).
- 문구는 단계별로 다르다. standard 는 선출 어휘와 `/seiri:verify` 하나, strict 는 전 순간을 이름으로 댄다. 정본은 `constants/turnReminders.ts` 이며 이 훅은 선택·주입만 한다.
- 순간 → 스킬 순으로 말하고 규칙 상기를 뒤에 싣는다. 이 훅이 닫는 실패가 "순간이 왔는데 스킬이 안 떴다" 이기 때문이다.
- 프롬프트 본문을 읽지 않는다. 규칙 본문도 복제하지 않는다.

## API Contracts

- `processUserPromptSubmit(...)` — 게이팅 + 문구 선택 + 상태 1절. 어떤 실패에도 `{ continue: true }`.

## Acceptance Criteria

### AC-turn-reminder-dial — 단계별 문구

- advisory 에서 아무것도 주입하지 않는다.
- standard 와 strict 가 각각 `constants/turnReminders.ts` 의 해당 문구를 쓴다.

### AC-workflow-state-once — 1회 소비

- 워크플로우 로드 다음 턴에만 상태 1절이 나오고 그 다음 턴에는 사라진다.
- 상태 읽기·쓰기 실패가 상기 주입을 막지 않는다.

### AC-no-prompt-read — 프롬프트 비열람

- 주입 내용이 사용자 프롬프트 본문에 의존하지 않는다.

## Last Updated

2026-07-30 — 매 턴 상기와 워크플로우 상태 1회 소비 계약을 문서화했다.
