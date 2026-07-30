# src — Contract

## Requirements

- `index.ts` 가 `@ogham/maencof` 의 유일한 라이브러리 표면이다. 모든 export 를 이름으로 열거하며, 여기 없는 심볼은 계약이 아니다.
- `createServer` · `startServer` 는 이 표면에 없다. 실행 진입점은 esbuild 가 `mcp/serverEntry/serverEntry.ts` 에서 만드는 `bridge/mcp-server.cjs` 이고, 배럴이 `mcp/server` 를 끌어오면 `server.ts → version.ts` 참조와 맞물려 `src → mcp → mcp/server → src` 순환이 된다.
- 의존 방향은 한쪽이다. `core/` 는 `mcp/` · `hooks/` 에 의존하지 않고, `types/` 는 zod 외 외부 의존성을 갖지 않는다.
- `version.ts` 는 빌드 시 `scripts/injectVersion.mjs` 가 생성한다. 직접 수정하지 않는다.
- `bridge/` 산출물은 esbuild 가 만든다. 소스는 `src/hooks/<event>/<event>.entry.ts` 와 `src/mcp/serverEntry/serverEntry.ts` 이며 산출물을 손대지 않는다.
- vault 아키텍처는 v2(L3 sublayer + L5 buffer/boundary)를 기대한다. 기대 버전과 다른 vault 는 `core/architectureMigrator` 가 v1→v2 로 마이그레이션한다.
- 세션 마감은 MCP 서버 수명주기가 소유한다. 매 턴 UserPromptSubmit `session-touch` 가 `lastActivityAt` · `usageSnapshot` 을 기록하고, 서버 shutdown(동기 정밀)과 다음 부팅 `bootSweep`(보장)이 `sweepStaleSessions` 로 레코드를 마감하며 workIndex 당일 digest 를 `buildDailyDigest` 로 재생성한다.
- 세션 종료 기록의 주소는 sessionStore 하나다. `.maencof-meta/sessions/*.md` 나 dailynote `.md` 에는 기록하지 않는다.

## API Contracts

### Entry point (`index.ts`)

- **Types** — `types/index.js` 의 런타임 값과 타입을 이름으로 재노출한다. 스키마(`CompanionIdentitySchema` · `DialogueConfigSchema` · `FrontmatterSchema` · `PersonSchema` 등), 레이어 좌표(`Layer` · `LAYER_DIR` · `L3_SUBDIR` · `L5_SUBDIR` · `dirFromLayer` · `layerFromDir` · `isLayer1Path`), `EDGE_TYPE`, `EXPECTED_ARCHITECTURE_VERSION`, 그리고 도구·훅 입출력 타입 전체.
- **Version** — `VERSION` (생성 상수).
- **Core** — `vaultScanner`(`scanVault` · `buildSnapshot` · `computeChangeSet` · `scanIncrementalChanges` · `readVaultFile`), `documentParser`(`parseYamlFrontmatter` · `extractFrontmatter` · `extractLinks` · `parseDocument` · `buildKnowledgeNode` · `parseDocumentFromFile`), `graphBuilder`(`buildGraph` · `buildAdjacencyList` · `detectOrphans`), `dagConverter`(`convertToDAG` · `applyLayerDirectionality`), `weightCalculator`(`calculateWeights` · `computePageRank` · `normalizeWeights` · `getLayerDecay` · `LAYER_DECAY_FACTORS`), `spreadingActivation`(`runAccumulativeActivation`), `communityDetector`(`CommunityDetector` · `detectCommunities`), `claudeMdMerger`(`mergeMaencofSection` · `readMaencofSection` · `removeMaencofSection` · `ClaudeMdMerger` · 마커 2종), `contentDedup`(`deduplicateContent`).
- **Search** — `queryEngine`(`query` · `resolveSeedNodes` · `deriveContextSeeds` · `QueryEngine` · `invalidateQueryCache`), `contextAssembler`(`assembleContext` · `extractBestSnippet` · `ContextAssembler`).
- **Index** — `metadataStore`(`serializeGraph` · `deserializeGraph` · `MetadataStore` · `CACHE_FILES`), `incrementalTracker`(`computeIncrementalChangeSet` · `computeOneHopNeighbors` · `computeIncrementalScope` · `createIncrementalSnapshot` · `IncrementalTracker`).
- **MCP** — `shared` 헬퍼(`toolResult` · `toolError` · `mapReplacer` · `getBacklinks` · `removeBacklinks`)와 도구 핸들러 일부(`handleMaencofCreate` · `handleMaencofRead` · `handleMaencofUpdate` · `handleMaencofDelete` · `handleMaencofMove` · `handleKgSearch` · `handleKgNavigate` · `handleKgContext` · `handleKgStatus` · `handleKgBuild`), 그리고 `mcp/server/middlewares` 의 `mergeStaleNodesIntoGraph`. 마지막 항목은 `mcp/index.ts` 가 `server/` 를 재노출하지 않으므로 그 하위 fractal 의 entry point 를 직접 가져간다.
- **Policy constant** — `READ_REINDEX_CAP`.

`mcp/index.ts` 가 노출하는 도구 핸들러 전체 집합보다 이 배럴의 MCP 묶음이 작다. 라이브러리 소비자가 실제로 쓰는 것만 승격하는 것이 현재 계약이다.

### Architecture version

`EXPECTED_ARCHITECTURE_VERSION` 은 `constants/architecture.ts` 가 소유한다. `core/architectureMigrator` 의 `checkArchitectureVersion` 이 vault 의 현재 값과 비교해 마이그레이션 필요 여부를 판정하고, `planMigration` 이 이 상수를 목표 버전으로 삼는다.

### 생성·번들 산출물

| 산출물                  | 생성기                       | 소스                                 |
| ----------------------- | ---------------------------- | ------------------------------------ |
| `src/version.ts`        | `scripts/injectVersion.mjs`  | `package.json` 버전                  |
| `bridge/<event>.mjs`    | `scripts/buildHooks.mjs`     | `src/hooks/<event>/<event>.entry.ts` |
| `bridge/mcp-server.cjs` | `scripts/buildMcpServer.mjs` | `src/mcp/serverEntry/serverEntry.ts` |

## Acceptance Criteria

### AC-enumerated-surface — 열거된 표면

- `index.ts` 가 모든 export 를 이름으로 적어, 내부 파일에 심볼을 더해도 공개 표면이 조용히 넓어지지 않는다.

### AC-no-server-in-barrel — 서버 비노출

- 배럴이 `createServer` · `startServer` 를 노출하지 않아 `src → mcp → mcp/server → src` 순환이 성립하지 않는다.

### AC-core-independent — core 독립

- `core/` 모듈이 `mcp/` · `hooks/` 를 import 하지 않는다.

### AC-types-dependency-free — types 무의존

- `types/` 가 zod 외 외부 의존성을 갖지 않는다.

### AC-generated-not-handwritten — 생성물 비수정

- `version.ts` 와 `bridge/` 산출물이 생성기 출력과 일치한다.

### AC-session-close-owned-by-mcp — 세션 마감 소유권

- 세션 마감이 MCP 서버 shutdown 과 다음 부팅 `bootSweep` 에서만 일어나고, 훅은 매 턴 touch 만 기록한다.

### AC-session-record-single-address — 세션 기록 단일 주소

- 세션 종료 기록이 sessionStore 밖(`.maencof-meta/sessions/*.md` · dailynote)에 남지 않는다.

## Boundary Exemptions

### `version.ts` — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: `allowed`
- **Reason**: 생성기(`scripts/injectVersion.mjs`)가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 소비자를 `src/index.ts` 로 돌리면 하위 fractal 이 조상 배럴의 공개 표면 전체에 의존하게 되고, SessionStart 훅 소비자는 배럴 경유가 번들 크기 가드에 걸려 아예 불가능하다.

## Last Updated

2026-07-30 — legacy SPEC 형태를 계약 절로 재구성하고, 현재 배럴 표면·생성 산출물·세션 마감 소유권에 acceptance group 을 붙였다.
