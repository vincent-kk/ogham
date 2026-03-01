# src SPEC

## Purpose
maencof 플러그인 라이브러리 진입점. 모든 공개 API를 index.ts에서 re-export.

## Public API
- Core: scanVault, parseDocument, buildGraph, convertToDAG, calculateWeights, runSpreadingActivation, detectCommunities, mergeMaencofSection
- Search: query, assembleContext, QueryEngine, ContextAssembler
- Index: MetadataStore, IncrementalTracker, computeIncrementalChangeSet
- MCP: createServer, startServer, tool handlers (maencof_*, kg_*)
- Types: 전체 타입 re-export (types/index.ts)

## Invariants
- core/ 모듈은 mcp/, hooks/에 의존하지 않음
- types/는 외부 의존성 없음 (zod 제외)
- version.ts는 빌드 시 자동 생성
