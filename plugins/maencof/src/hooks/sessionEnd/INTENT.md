# sessionEnd

## Purpose

SessionEnd 이벤트 디스패처. `helpers/finalize`(세션 레코드 마감·일일 digest·캐시 정리)·`helpers/changelogDebt`(감시 경로 미기록 변경 스캔)·`helpers/archiveExpired`(L4 만료본 아카이빙)와 공유 `lifecycleDispatcher`·`vaultCommitter`를 순차·격리 실행하고 단일 envelope로 병합한다.

## Structure

- `sessionEnd.entry.ts` — 브리지 진입점
- `sessionEnd.ts` — `orchestrateSessionEnd` (조립 + 병합)
- `helpers/finalize/` — 세션 종료 마감
- `helpers/changelogDebt/` — 미기록 변경 1회 스캔 → changelog-state.json (다음 SessionStart 가 권고 표면화)
- `helpers/archiveExpired/` — L4 만료 문서 archive 이동 + 스텁

## Conventions

- 헬퍼·공유 관심사·core 는 concrete 경로로 import (배럴 `index.js` 금지)
- 실행 순서: finalize → lifecycle → changelogDebt → archiveExpired → vaultCommitter(마지막 — finalize·스캔·아카이빙 기록을 커밋에 포함)

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 격리
- vaultCommitter 는 finalize 의 파일 기록 뒤에 실행

### Ask first

- 종료 기록 / 관심사 추가

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 배럴(index.js) import (훅 번들 비대)
