# userPromptSubmit

## Purpose

UserPromptSubmit 이벤트 디스패처. `helpers/contextInjector`·`helpers/insightInjector`와 공유 `lifecycleDispatcher`·`vaultCommitter`를 순차·격리 실행하고 단일 envelope로 병합한다.

## Structure

- `userPromptSubmit.entry.ts` — 브리지 진입점
- `userPromptSubmit.ts` — `orchestrateUserPromptSubmit` (조립 + 병합)
- `helpers/contextInjector/` — KG/turn 컨텍스트 주입
- `helpers/insightInjector/` — insight 캡처 상태 배너

## Conventions

- 헬퍼·공유 관심사·core 는 concrete 경로로 import (배럴 `index.js` 금지)
- 실행 순서: contextInjector → lifecycle → insightInjector → vaultCommitter(마지막, side-effect)

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 격리
- vaultCommitter 는 컨텍스트 관심사 뒤에 실행

### Ask first

- 관심사 추가 / 실행 순서 변경

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 배럴(index.js) import (훅 번들 비대)
