# mcp — Contract

## Requirements

- stdio 전송으로 도구 21개를 제공하는 MCP 서버 구현을 소유한다. vault 경로는 `MAENCOF_VAULT_PATH` 환경변수 또는 호스트 워크스페이스 루트에서 해석하며, 둘 다 해석되지 않으면 throw 한다.
- 모든 도구 입력은 Zod 스키마로 검증한다. 도구 핸들러는 파일 I/O 를 직접 수행하지 않고 `core/` 모듈에 위임한다.
- 공통 host registry의 상태 루트와 `~/.config` exact/descendant는 canonical directory boundary 검사 뒤 vault 로 받지 않는다. 전역 설정 디렉터리를 지식 트리로 다루면 도구가 사용자 설정을 문서처럼 쓰고 지운다.
- 배럴은 라이브러리 API 만 노출한다. 실행 진입점인 `server/` 와 `serverEntry/` 는 재노출하지 않는다 — `serverEntry` 는 top-level `startServer()` 호출이라는 부수효과를 갖고, `server` 는 `server.ts → version.ts` 참조 때문에 재노출하면 `src → mcp → mcp/server → src` 순환이 된다. 실행 진입점은 서버 형제 배럴을 직접 가져간다.
- `serverEntry.ts` 에 서버 로직을 추가하지 않는다. esbuild 진입점이며 `startServer` 앞에 `runCompanionMigration` 1회(best-effort, 멱등)만 허용한다.
- 그래프 캐시 무효화는 쓰기 도구의 계약이다. `create` · `update` · `delete` · `move` · `capture_insight` · `kg_build` 성공 시 `invalidateCache()` 가 호출된다.
- KG 그래프와 무관한 쓰기는 캐시를 무효화하지 않는다. `companion_edit` 은 preview 경로를 순수하게 유지해야 하고, `capture_personal_context` 는 개인 컨텍스트 전용 메타데이터 레코드만 다루므로 둘 다 read 래퍼로 등록한다.
- read-path 는 in-flight rebuild 를 await 하지 않는다. `ensureFreshGraph` 가 stale 감지 시 비차단 증분 반영을 하고, `loadGraphIfNeeded` 는 자동 리빌드 없이 캐시/디스크만 읽는 진단용(`kg_status`) 경로다. 중복 동시 리빌드는 뮤텍스가 막는다.
- 도구별 출력 계약과 rendering convention 은 각 도구 fractal 의 `DETAIL.md` 가 소유한다. 이 문서에 복제하지 않는다.

## API Contracts

### Entry point (`index.ts`)

라이브러리 소비자에게 두 묶음을 이름으로 재노출한다.

- `shared/` — `getBacklinks` · `mapReplacer` · `removeBacklinks` · `toolError` · `toolResult`
- `tools/` — 도구 핸들러(`handleMaencof*` · `handleKg*` · `handleClaudeMd*` · `handleCompanionEdit` · `handleContextCacheManage` · `handlePersonalContextCapture` · `handleActivityRead` · `handleCaptureInsight` · `handleWorkHistory`)와 입력 스키마(`captureInsightInputSchema` · `contextCacheManageInputSchema` · `personalContextCaptureInputSchema`), 보조 유틸(`buildStemIndex` · `resolveAndAttachLinks` · `selectContextCandidates` · `InsightCategoryEnum`), 그리고 도구 입출력 타입

`server/` · `serverEntry/` 는 이 표면에 없다. 서버를 띄우는 유일한 경로는 esbuild 가 `mcp/serverEntry/serverEntry.ts` 에서 만드는 `bridge/mcp-server.cjs` 다.

### 도구 표면 (21)

| Group                | Tools                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| CRUD (5)             | `create` · `read` · `update` · `delete` · `move`                                      |
| Insight (1)          | `capture_insight`                                                                     |
| Graph (6)            | `kg_search` · `kg_navigate` · `kg_context` · `kg_status` · `kg_build` · `kg_timeline` |
| Link (1)             | `kg_suggest_links`                                                                    |
| Instruction file (3) | `claudemd_merge` · `claudemd_read` · `claudemd_remove`                                |
| Companion (1)        | `companion_edit`                                                                      |
| Personal context (1) | `capture_personal_context`                                                            |
| Activity (1)         | `activity_read`                                                                       |
| Work history (1)     | `work_history`                                                                        |
| Cache (1)            | `context_cache_manage`                                                                |

이름의 정본은 `constants/mcpToolNames.ts` 의 `McpToolName` 이고, 등록 배치는 `server/registrations/` 가 소유한다.

### 그래프 캐시 두 경로

- `ensureFreshGraph(vaultPath)` — read-path 자동 증분 반영. stale 노드가 있으면 비차단으로 반영한 그래프 reference 를 준다.
- `loadGraphIfNeeded(vaultPath)` — 자동 리빌드 없는 적재. `kg_status` 진단 전용이다.

## Acceptance Criteria

### AC-server-not-reexported — 실행 진입점 비노출

- 배럴이 `server/` · `serverEntry/` 를 재노출하지 않아 `src → mcp → mcp/server → src` 순환이 성립하지 않는다.

### AC-zod-validated-input — 입력 검증

- 모든 도구가 Zod 스키마로 입력을 검증한 뒤 핸들러에 들어간다.

### AC-no-direct-io-in-handlers — 핸들러 I/O 위임

- 도구 핸들러가 파일 I/O 를 직접 수행하지 않고 `core/` 에 위임한다.

### AC-blocked-global-config — 전역 설정 차단

- vault 경로가 `~/.claude` · `~/.codex` · `~/.config` exact/descendant 또는 canonical alias로 해석되면 서버가 거부하고 sibling-lookalike는 허용한다.

### AC-graph-free-writes-keep-cache — 그래프 무관 쓰기의 캐시 보존

- `companion_edit` · `capture_personal_context` 호출이 그래프 캐시를 무효화하지 않는다.

### AC-read-never-awaits-rebuild — read 비차단

- freshness 가 필요한 read 도구가 진행 중인 rebuild 를 await 하지 않는다.

### AC-server-entry-thin — 진입점 최소화

- `serverEntry.ts` 가 `runCompanionMigration` 1회와 `startServer` 외의 서버 로직을 갖지 않는다.

## History

- 2026-08-04 — L5 재정의로 `boundary_create` 도구를 제거해 표면이 22 에서 21 로 줄었다. 임시 수용소(L5 buffer)가 `sub_layer` 위임 대신 `buffer_type` 평면 배치로 바뀌면서 경계 문서를 따로 만들 대상이 사라진 것이 이유다.

## Last Updated

2026-08-04 — `boundary_create` 제거를 반영해 도구 표면을 21 로 정정하고 entry point 재노출 목록에서 `handleBoundaryCreate` 를 뺐다.
