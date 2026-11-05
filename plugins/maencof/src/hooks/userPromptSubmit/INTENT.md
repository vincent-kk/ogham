# userPromptSubmit

## Purpose

UserPromptSubmit 이벤트 디스패처. 컨텍스트·인사이트 주입 헬퍼와 공유 수명주기·볼트 커밋 관심사를 순차·격리 실행하고 단일 envelope로 병합한다.

## Conventions

- 헬퍼·공유 관심사·core 는 concrete 경로로 import (배럴 `index.js` 금지)
- 실행 순서: contextInjector → lifecycle → insightInjector → session-touch → vaultCommitter(마지막, side-effect)

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 격리
- vaultCommitter 는 컨텍스트 관심사 뒤에 실행

### Ask first

- 관심사 추가 / 실행 순서 변경

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 배럴(index.js) import (훅 번들 비대)
