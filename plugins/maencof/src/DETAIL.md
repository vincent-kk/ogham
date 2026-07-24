# src SPEC

## Purpose

maencof 플러그인 라이브러리 진입점. 모든 공개 API를 index.ts에서 re-export.

## Module Layout

| Directory | Role                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `core/`   | 순수 함수 모듈 (VaultScanner I/O 예외)                                                                     |
| `mcp/`    | MCP 서버 + 22개 도구 핸들러                                                                                |
| `hooks/`  | Claude Code hook 핸들러 (configProvisioner, changelogDebt, activityRecorder, sessionStart, configRegistry) |
| `types/`  | 공유 타입 (외부 의존성 없음, zod 제외)                                                                     |
| `index/`  | MetadataStore, IncrementalTracker                                                                          |

## Public API

- Core: scanVault, parseDocument, buildGraph, convertToDAG, calculateWeights, runSpreadingActivation, detectCommunities, mergeMaencofSection, ArchitectureMigrator, readChangelogState/writeChangelogState, parseYamlFrontmatter, extractLinks
- Core (internal): `quoteYamlValue`, `parseScalarValue` — YAML 직렬화 특수문자 안전 처리 (mcp/tools 내부 전용)
- Types: EdgeType에 `DOMAIN` 추가, KnowledgeNode에 `mentioned_persons`/`outboundLinks` 필드, KnowledgeGraph에 `EdgeTypeMap`
- Search: query, assembleContext, QueryEngine, ContextAssembler, deriveContextSeeds (kg_context 자연어 분해 — 단어 OR + 인접 2-gram phrase 시드)
- Index: MetadataStore, IncrementalTracker, computeIncrementalChangeSet
- MCP: createServer, startServer, tool handlers (maencof*\*, kg*\_, boundary\_\_, claudemd*\*, activity*\*, workHistory)
- Types: 전체 타입 re-export (types/index.ts)

## Architecture Version

- `EXPECTED_ARCHITECTURE_VERSION = '2.0.0'` (L3 sublayers + L5 buffer/boundary)
- vault migration: ArchitectureMigrator (v1 → v2 자동 마이그레이션)

## Invariants

- core/ 모듈은 mcp/, hooks/에 의존하지 않음
- types/는 외부 의존성 없음 (zod 제외)
- version.ts는 빌드 시 injectVersion.mjs가 자동 생성; 직접 수정 금지
- bridge/ 출력 파일은 esbuild가 생성; 소스는 src/hooks/ 및 mcp/serverEntry.ts

## Session Lifecycle Notes

- 세션 마감은 MCP 서버 수명주기가 소유한다: 매 턴 UserPromptSubmit `session-touch` 가 `lastActivityAt`/`usageSnapshot` 을 기록하고, 서버 shutdown(동기 정밀)·다음 부팅 bootSweep(보장)이 `sweepStaleSessions` 로 레코드를 마감하며 workIndex 당일 digest 를 재생성한다(`buildDailyDigest`).
- 세션 종료 기록은 sessionStore 전용이다 — `.maencof-meta/sessions/*.md` 나 dailynote .md 에는 기록하지 않는다.
