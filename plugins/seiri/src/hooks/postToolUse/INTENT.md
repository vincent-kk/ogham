# postToolUse — 게이트 판정 · 실패 연쇄 · 워크플로우 관측

## Purpose

실행된 Bash가 작업 원장의 CHECK와 일치하면 관측 가능한 결과를 기록하고 **정확히 한 줄 판정**을 주입한다. 일치하지 않는 연속 실패에는 기존 한 줄 제안을 유지하고, `Skill` 로드는 다음 턴을 위해 관측만 한다. 어느 경로도 차단하지 않는다.

## Conventions

- **순서는 다이얼 → Skill → Bash 다.** advisory 면 원장과 세션 상태를 건드리기 전에 빠져나온다.
- **`Skill` 은 답하지 않는다.** seiri 워크플로우면 마지막 상태만 기록하고 무주입으로 빠진다 — 문구는 다음 턴(userPromptSubmit) 몫이다.
- **Bash 판정은 다섯 가지다.** exit 0의 증명·불일치, 비-0의 stderr 증명·불일치, stdout 비관측을 각각 met·unmet·unobservable 로 말한다.
- 같은 CHECK가 여러 작업에 있어도 한 호출의 판정은 한 줄이다. met가 되돌아가면 regression을 밝히고, 서브에이전트 증거는 짧은 `agent_id` 표지를 남긴다.
- 실패 `error`가 `Exit code N` 외 본문을 싣지 않으면 stdout은 관측할 수 없으므로 원장을 바꾸지 않고 unobservable로 답한다.
- 사용자가 끊은 실행은 판정·카운트하지 않는다. CHECK 불일치는 기존 실패 연쇄로 흐르고, CHECK 일치 실패가 임계에 닿으면 같은 판정 줄에 연쇄 힌트를 합친다.
- 원장·세션 신호 실패는 fail-open이다. 이미 원장이 바뀌었다면 세션 신호 실패가 판정 줄을 삼키지 않는다.

## Boundaries

### Always do

- 어떤 실패에도 `{ continue: true }` — 매 셸 명령마다 도는 훅이다.
- 새 문구·새 조건 전에 "의도된 red 를 오발화시키는가"를 먼저 답할 것.

### Ask first

- 임계값 변경 (`constants/failureChain.ts`).
- matcher 확대 (Bash 외 도구).

### Never do

- `decision` 제어·차단 반환. 신호는 제안이다.
- 명령 원문·전체 stderr 를 주입 문구에 넣기 — 모델은 이미 그 결과를 봤다.
- 배럴 import — 번들이 무거워진다.

## Dependencies

- `../../core/gates/record/` · `../../core/gates/render/` — 번들 상한 때문에 필요한 판정·렌더만 concrete import 한다(면제 근거는 gates DETAIL).
