# sessionStart

## Purpose

SessionStart 이벤트 디스패처. `helpers/bootstrap`(볼트 init·CLAUDE.md 머지·dialogue meta-skill·세션 기록)와 공유 `lifecycleDispatcher`를 순차·격리 실행하고 단일 envelope로 병합한다.

## Structure

- `sessionStart.entry.ts` — 브리지 진입점 (stdin → selfProbe → orchestrator → stdout)
- `sessionStart.ts` — `orchestrateSessionStart` (조립 + 병합)
- `helpers/bootstrap/` — 세션 시작 실제 작업
- `helpers/probeAdvisory/` — selfProbe 오류 필터 + 경고 조립
- `helpers/remindExpiredBuffer/` — L5 buffer TTL 만료 알림 (삭제하지 않음)

## Conventions

- 헬퍼·공유 관심사·core 는 concrete 경로로 import (배럴 `index.js` 금지)
- entry는 `@ogham/cross-platform` package root에서 `selfProbeHook`만 named import한다. `sideEffects: false` tree-shaking 뒤 emitted-byte cap과 `FORBIDDEN_PATTERNS`가 출력을 검증하며, probeAdvisory가 필터한 오류만 additionalContext 끝에 덧붙인다
- 실행 순서: bootstrap → lifecycle

## Boundaries

### Always do

- 각 관심사를 `safeConcern` 으로 감싸 격리

### Ask first

- 관심사 추가 / 실행 순서 변경

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- 플러그인 내부 배럴(index.js) import (훅 번들 비대)
- 범용 selfProbe/spawn/cross-spawn import
