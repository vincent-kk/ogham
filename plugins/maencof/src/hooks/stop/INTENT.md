# stop

## Purpose

Stop 이벤트 디스패처. `helpers/changelogGate`(감시 경로 미커밋 변경 시 세션 종료 차단 + migration.lock 정리)와 공유 `lifecycleDispatcher`를 순차·격리 실행하고 단일 envelope로 병합한다.

## Structure

- `stop.entry.ts` — 브리지 진입점 (차단 시 stderr + `exit(2)`)
- `stop.ts` — `orchestrateStop` (조립 + 병합)
- `helpers/changelogGate/` — changelog 게이트 + orphan lock cleanup

## Conventions

- 헬퍼·공유 관심사 는 concrete 경로로 import (배럴 `index.js` 금지)
- 차단은 entry 에서 `reason`(+`systemMessage`)을 stderr 로 쓰고 `exit(2)`

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 격리
- changelogGate 를 먼저 실행 (lock cleanup 은 항상 수행)

### Ask first

- 차단 조건 / 관심사 추가

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 배럴(index.js) import (훅 번들 비대)
