# server

## Requirements

- mutate 1회 → `registerMutateTool` wrapper가 (a) 핵심 핸들러 실행, (b) 영향 path를 `appendStaleNodes`로 등록, (c) `incrementUsageStat`, (d) stale 누적이 `STALE_REBUILD_THRESHOLD`에 도달하면 `triggerBackgroundRebuild`를 fire-and-forget.
- freshness 필요 read → `registerReadTool({ needsFreshness: true })` wrapper가 `ensureFreshGraphNonBlocking` 결과 graph reference를 핸들러에 전달. 절대 await rebuild.
- freshness 불필요 read → `registerReadTool({ needsFreshness: false })` wrapper가 `incrementUsageStat`만 수행.
- 부팅 시 `startServer`는 transport connect 직후 `walkVaultForExternalChanges(getVaultPath())`를 detach. snapshot 부재 시 no-op이라 첫 부팅 폭주 없음.
- background rebuild 성공 finalize에서 `invalidateCache()`를 호출해 다음 read가 disk reload.

## API Contracts

- `ensureFreshGraph(vaultPath): Promise<KnowledgeGraph>` — `freshness-guard.ts::ensureFreshGraphNonBlocking`의 thin wrapper.
- `registerMutateTool(server, name, schema, coreHandler, getAffectedPath)` — 8 mutate tool에 적용.
- `registerReadTool(server, name, schema, coreHandler, { needsFreshness })` — 4 freshness-read + 6 plain-read에 적용.
- `triggerBackgroundRebuild(vaultPath): void` — 모듈 레벨 mutex로 중복 트리거 차단, 절대 await 노출 금지.

## Stale management semantics

- `STALE_REBUILD_THRESHOLD` (절대 개수): mutate 후 background rebuild trigger 임계치이자 read 시 partial reindex 권장 상한. 기존 `STALE_THRESHOLD_PERCENT`(advisory 비율)와 단위가 다르다.
- partial reindex는 Hybrid: stale path별 `parseDocument` + `buildKnowledgeNode`로 node 교체 + outbound edge 재계산. weights / PageRank / edgeWeightMap / edgeTypeMap / adjacencyList는 background rebuild 의존.
- stale 정보는 인덱서 내부 상태 — LLM 컨텍스트, 도구 응답, 진단 외 표면에 노출 금지.
