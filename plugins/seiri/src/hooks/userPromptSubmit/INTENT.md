# userPromptSubmit — 매 턴 스킬 발동 상기

## Purpose

매 사용자 턴이 시작될 때 **한 줄 상기**를 주입한다. SessionStart 는 세션
머리에서 한 번 자세를 말하지만, 긴 세션은 그것을 밀어내고 컴팩션은 아예
떨군다 — 스킬이 떠야 할 순간이 곧 그 자세가 사라진 순간이다. 여기서 그
핵심을 매 턴 되살린다. 차단하지 않고, 스킬 축을 앞세운다.

## Structure

- `userPromptSubmit.ts` — `processUserPromptSubmit` (게이팅 + 다이얼별 문구)
- `userPromptSubmit.entry.ts` — esbuild 번들 진입점
  (`bridge/user-prompt-submit.mjs`)

## Conventions

- **다이얼이 먼저다.** advisory 면 주입 없이 빠져나온다 — 발동율이 측정된
  그 상태를 유지한다. standard·strict 만 말한다.
- **단계별로 문구가 다르다.** standard 는 상기, strict 는 경계·작은 작업까지
  넓히고 완료 전 검증을 요구한다. 문구 정본은 `constants/intervention.ts`
  (`TURN_REMINDER_STANDARD` · `TURN_REMINDER_STRICT`).
- **스킬 축이 앞선다.** 이 훅이 닫는 실패는 "순간이 왔는데 스킬이 안 떴다"
  이므로, 문구는 순간→스킬을 먼저 대고 규칙 상기는 뒤에 싣는다.
- 프롬프트 본문(`prompt`)을 읽지 않는다 — 상기는 내용과 무관하다.
- 상기지 지침의 재사본이 아니다. 전체 체인·자세는 SessionStart 소관이며,
  strict 문구가 그 자세와 겹치는 것은 의도다(자세히 한 번, 매 턴 상기).

## Boundaries

### Always do

- 어떤 실패에도 `{ continue: true }` — 매 턴 도는 훅이다.
- 문구 변경은 `constants/intervention.ts` 에서. 여기는 선택·주입만.

### Ask first

- matcher 확대나 발화 조건 변경.
- 주입 길이 증가 — 매 턴 비용이다.

### Never do

- `decision` 제어·차단 반환. 상기는 제안이다.
- 규칙 본문·전체 워크플로 체인 복제. SessionStart 가 그 자리다.
- 배럴 import — 번들이 무거워진다.

## Dependencies

- `../../core/infra/configLoader/loaders/loadIntervention.js` (concrete)
- `../../constants/` (intervention · plugin · hooks)
