# src SPEC

## Purpose
maencof 플러그인 라이브러리 진입점. 모든 공개 API를 index.ts에서 re-export.

## Module Layout

| Directory | Role |
|-----------|------|
| `core/` | 순수 함수 모듈 (VaultScanner I/O 예외) |
| `mcp/` | MCP 서버 + 18개 도구 핸들러 |
| `hooks/` | Claude Code hook 핸들러 (config-provisioner, changelog-gate, dailynote-recorder, session-start, config-registry) |
| `types/` | 공유 타입 (외부 의존성 없음, zod 제외) |
| `index/` | MetadataStore, IncrementalTracker |

## Public API
- Core: scanVault, parseDocument, buildGraph, convertToDAG, calculateWeights, runSpreadingActivation, detectCommunities, mergeMaencofSection, ArchitectureMigrator, ChangelogWriter, parseYamlFrontmatter, extractLinks
- Core (internal): `quoteYamlValue`, `parseScalarValue` — YAML 직렬화 특수문자 안전 처리 (mcp/tools 내부 전용)
- Types: EdgeType에 `DOMAIN` 추가, KnowledgeNode에 `mentioned_persons`/`outboundLinks` 필드, KnowledgeGraph에 `EdgeTypeMap`
- Search: query, assembleContext, QueryEngine, ContextAssembler
- Index: MetadataStore, IncrementalTracker, computeIncrementalChangeSet
- MCP: createServer, startServer, tool handlers (maencof_*, kg_*, boundary_*, claudemd_*, dailynote_*)
- Types: 전체 타입 re-export (types/index.ts)

## Architecture Version
- `EXPECTED_ARCHITECTURE_VERSION = '2.0.0'` (L3 sublayers + L5 buffer/boundary)
- vault migration: ArchitectureMigrator (v1 → v2 자동 마이그레이션)

## Invariants
- core/ 모듈은 mcp/, hooks/에 의존하지 않음
- types/는 외부 의존성 없음 (zod 제외)
- version.ts는 빌드 시 inject-version.mjs가 자동 생성; 직접 수정 금지
- bridge/ 출력 파일은 esbuild가 생성; 소스는 src/hooks/ 및 mcp/server-entry.ts

## Hook Notes
- `session-end`는 `.maencof-meta/sessions/`에 세션 요약을 저장하되, `skills_used`, `files_modified`, 누적 usage stats, stale nodes 중 하나라도 있을 때만 파일을 남긴다.
- 활동/상태 정보가 전혀 없는 빈 세션은 요약 파일을 생성하지 않는다. 세션 종료 자체는 계속 `maencof-dailynote`에 기록되어 빈 세션 여부를 간접적으로 추론할 수 있다.
