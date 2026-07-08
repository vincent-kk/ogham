# hooks

## Purpose

Claude Code 훅 진입점. 이벤트마다 하나의 디렉토리(`sessionStart` / `userPromptSubmit` / `preToolUse` / `postToolUse` / `sessionEnd`)가 그 이벤트의 브리지 entry + 얇은 orchestrator + `helpers/`(관심사)를 소유한다. 여러 이벤트가 공유하는 관심사·헬퍼는 `utils/` 하위에 둔다. Stop 이벤트는 사용하지 않는다 — 매 턴 프로세스 spawn 비용 때문에 세션 단위 관심사는 SessionEnd(스캔)·SessionStart(표면화)로 배치한다.

## Structure

- `<event>/` — 이벤트별 디스패처: `<event>.entry.ts`(브리지) + `<event>.ts`(orchestrator) + `helpers/<concern>/`
- `utils/` — 여러 이벤트 공유: `lifecycleDispatcher/` · `vaultCommitter/` · `gitUtils/` · `configRegistry/` · `configProvisioner/`(관심사 fractal) + `mergeHookOutput/` · `safeConcern/`(디스패치 헬퍼)
- `shared/` — 경로·stdin·vault 판별 공유 organ
- 디스패치 envelope 타입은 `../types/dispatch.ts`, mcp 와 공유하는 도메인(`cacheManager` / `turnContext`)은 `../core/` 에 있다 (둘 다 hooks 아님)

## Boundaries

### Always do

- 헬퍼·공유 관심사·core 는 concrete 경로로 import (배럴 `index.js` 금지 — 훅 번들 비대)
- 각 관심사를 `safeConcern` 으로 격리; orchestrator 는 얇게 유지

### Ask first

- 새 이벤트/관심사 추가 시 build-hooks.mjs (`entryPath`) 갱신
- orchestrator 실행 순서·병합 계약 변경

### Never do

- entry / orchestrator 에 로직 인라인 (helpers 경유)
- core/ 모듈 직접 수정; 훅 간 순환 의존
- 인덱서 내부 상태(stale-node, freshness)를 훅으로 처리하거나 컨텍스트에 노출 (MCP server 책임)
