# server

## Requirements

- mutate 1회 → `registerMutateTool` wrapper가 (a) 핵심 핸들러 실행, (b) toolName 에 따른 op 분류로 영향 path 를 `appendStaleEntries` 로 기록 (delete/move-src=delete; 그 외/move-dst=mutate), (c) `incrementUsageStat`, (d) stale 누적이 `STALE_REBUILD_THRESHOLD` 에 도달하면 `triggerBackgroundRebuild` 를 fire-and-forget.
- freshness 필요 read → `registerReadTool({ needsFreshness: true })` wrapper 가 `ensureFreshGraphNonBlocking` 결과 graph reference 를 핸들러에 전달. 절대 await rebuild.
- freshness 불필요 read → `registerReadTool({ needsFreshness: false })` wrapper 가 `incrementUsageStat` 만 수행.
- 부팅 시 `startServer` 는 `registerShutdown(vaultPath)` 로 종료 핸들러를 먼저 등록한 뒤, transport connect 직후 `bootSweep`(직전 세션 잔여 완결) → `walkVaultForExternalChanges`(외부 편집·sweep 이동의 stale 등록) → `triggerBootRebuildIfStale`(stale 존재 시 background 증분 빌드 1회) 체인을 detach. 절대 await 하지 않으며(부팅 비차단) 각 단계는 부재 시 no-op.
- background rebuild 성공 finalize 에서 `invalidateCache()` 를 호출해 다음 read 가 disk reload.
- explicit `kg_build` 도구 호출도 성공 시 등록부에서 `invalidateCache()` 를 호출 (background rebuild 와 동일 계약). 핸들러는 disk 에만 `saveGraph` 하므로, 이 invalidate 없이는 동일 세션 후속 read(`loadGraphIfNeeded` 경유 `kg_status` 포함)가 build 직전 캐시 그래프를 계속 반환한다.
- 두 rebuild 경로(explicit `kg_build` / background) 모두 성공 시 `refreshTurnContextSafe(vaultPath)` 로 훅 주입용 turn-context 스냅샷을 재빌드한다 — 매 턴 `<kg-core>` 요약이 자신이 요약하는 디스크 인덱스를 따라가게 하는 동일 계약의 확장 (best-effort, 실패는 error-log).

## API Contracts

- `ensureFreshGraph(vaultPath): Promise<KnowledgeGraph | null>` — `freshnessGuard.ts::ensureFreshGraphNonBlocking` 의 thin wrapper. graph 부재 시 null.
- `registerMutateTool(server, name, schema, coreHandler, getAffectedPath)` — mutate tool 등록.
- `registerReadTool(server, name, schema, coreHandler, { needsFreshness })` — freshness-read 와 plain-read 등록.
- `triggerBackgroundRebuild(vaultPath): void` — 모듈 레벨 mutex 로 중복 트리거 차단, 절대 await 노출 금지.
- `mergeStaleNodesIntoGraph(vaultPath, graph, entries?): Promise<KnowledgeGraph>` — Hybrid partial reindex. Side Effects: graph 의 nodes/edges/invertedIndex in-place mutation, 변경 적용 시 module-level queryCache 자동 invalidate.

## Stale management semantics

- Stale 영속 스키마: `{ entries: { path, op:'mutate'|'delete' }[], updatedAt }`. 레거시 `{ paths }` 는 자동으로 `op='mutate'` 로 승격.
- partial reindex 는 Hybrid: stale entries 별 분기 — `mutate` 는 `parseDocument`+`buildKnowledgeNode` 로 node 교체 + outbound edge 재계산, `delete` 는 graph.nodes/edges 에서 제거. `nodes`, outbound `LINK` edges, `invertedIndex` 가 partial-maintained 집합. weights / PageRank / edgeWeightMap / edgeTypeMap / adjacencyList 는 background rebuild 의존.
- `mergeStaleNodesIntoGraph(vaultPath, graph, entries?)` 는 `Promise<KnowledgeGraph>` 시그니처를 유지한다. Side effects: graph 의 nodes/edges/invertedIndex in-place mutation, 그리고 변경이 실제로 적용된 경우 (`replacedSourceIds.size + anyDeleted > 0`) module-level `queryCache` 를 자동 invalidate. graph.builtAt 미변경 in-place mutation 으로 동일 builtAt 키에 묶인 SA 캐시 결과의 stale-read 를 차단한다 — 호출자는 별도 `invalidateQueryCache()` 호출이 불필요하다.
- read 1회 처리량은 `READ_REINDEX_CAP` 로 제한 (가장 최근 항목 우선 `slice(-N)`; 초과분은 background rebuild 가 흡수). bg rebuild trigger 는 별개 `STALE_REBUILD_THRESHOLD` 로 통제 — 두 상수는 동일 값이라도 의미가 다르므로 항상 별도 import.
- stale 정보는 인덱서 내부 상태 — LLM 컨텍스트, 도구 응답, 진단 외 표면에 노출 금지.

## Acceptance Criteria

### AC-boot-never-blocks — 부팅 비차단

- `startServer` 가 transport connect 뒤의 bootSweep → vaultWalk → boot rebuild 체인을 await 하지 않고, 각 단계는 대상이 없으면 no-op 으로 지나간다.

### AC-read-never-awaits-rebuild — read 비차단

- freshness 가 필요한 read 도구가 진행 중인 rebuild 를 await 하지 않고 현재 graph reference 로 응답한다.

### AC-rebuild-invalidates-cache — 리빌드 후 무효화

- background rebuild 와 explicit `kg_build` 가 성공하면 `invalidateCache()` 가 호출되어 다음 read 가 disk 에서 다시 읽는다.

### AC-turn-context-follows-index — turn-context 동기

- 두 rebuild 경로 모두 성공 시 `refreshTurnContextSafe` 로 훅 주입용 스냅샷을 재빌드한다 (best-effort, 실패는 error-log).

### AC-mutate-records-affected-path — mutate stale 기록

- mutate 도구 1회가 toolName 에 따른 op 분류로 영향 경로를 stale 로 기록한다 (delete/move-src=delete, 그 외/move-dst=mutate).

### AC-partial-reindex-in-place — 부분 재색인 in-place

- `mergeStaleNodesIntoGraph` 가 graph 를 in-place 로 갱신하고 변경이 적용된 경우 module-level queryCache 를 자동 무효화해, 호출자가 별도 `invalidateQueryCache()` 를 부르지 않아도 stale-read 가 생기지 않는다.

### AC-read-reindex-capped — read 처리량 상한

- read 1회가 처리하는 stale 항목 수가 `READ_REINDEX_CAP` 를 넘지 않는다.

### AC-stale-not-exposed — stale 비노출

- `kg_status` 진단 응답을 제외한 도구 응답에 stale 메타정보가 담기지 않는다.

## Last Updated

2026-07-30 — 비차단 read·부팅 체인·리빌드 후 무효화·부분 재색인 계약에 검증 가능한 acceptance group 을 붙였다.
