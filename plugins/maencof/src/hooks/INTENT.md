# hooks — Claude Code 이벤트 orchestration 경계

## Purpose

Claude Code 훅 진입점과 이벤트별 orchestration을 소유한다. 각 이벤트는 얇은 bridge와 orchestrator로 제한하고, 여러 이벤트의 공통 관심사는 내부 공유 경계에서 재사용한다. Stop·SessionEnd는 매 턴 비용과 호스트 이식성 때문에 훅으로 처리하지 않으며, 세션 종료 관심사는 MCP 서버 수명주기에 맡긴다. 훅은 매 턴 `session-touch`로 그 판단 재료만 기록한다.

## Conventions

- 이벤트 진입점은 호스트가 위치로 로드하므로 bridge와 orchestrator를 얇게 유지한다.
- 공통 관심사는 둘 이상의 이벤트가 소비할 때만 공유 경계로 올린다.

## Boundaries

### Always do

- 헬퍼·공유 관심사·core 는 concrete 경로로 import (배럴 `index.js` 금지 — 훅 번들 비대)
- 공유 패키지는 package root에서 named import한다. `sideEffects: false` tree-shaking 뒤 emitted bytes와 `FORBIDDEN_PATTERNS`를 검사해 출력 격리를 보장한다
- 각 관심사를 `safeConcern` 으로 격리; orchestrator 는 얇게 유지

### Ask first

- 새 이벤트/관심사 추가 시 buildHooks.mjs (`entryPath`) 갱신
- orchestrator 실행 순서·병합 계약 변경

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- core/ 모듈 직접 수정; 훅 간 순환 의존
- 인덱서 내부 상태(stale-node, freshness)를 훅으로 처리하거나 컨텍스트에 노출 (MCP server 책임)
