# graph-cache

## Purpose

vault 경로 해석 + in-memory KnowledgeGraph 캐시 보관. read-path freshness gating은 middlewares/freshness-guard에 위임.

## Boundaries

### Always do

- `getVaultPath()`로만 vault 경로 결정 (BLOCKED_PREFIXES 검사)
- `MetadataStore.loadGraph()`로만 그래프 적재
- `invalidateCache()` 시 query-cache도 함께 무효화

### Ask first

- BLOCKED_PREFIXES 변경 (보안 영향)
- 캐시 키 정책 변경 (단일 vault → multi vault 등)

### Never do

- 모듈 외부에서 cachedGraph / cacheVaultPath 직접 조작
- ensureFreshGraph가 in-flight rebuild를 await
- vault 경로를 환경변수/CWD 외 경로에서 가져오기
