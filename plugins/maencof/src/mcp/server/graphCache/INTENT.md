# graphCache

## Purpose

vault 경로 해석 + in-memory KnowledgeGraph 캐시 보관. read-path freshness gating은 middlewares/freshnessGuard에 위임.

## Boundaries

### Always do

- `getVaultPath()`로만 vault 경로 결정 — `MAENCOF_VAULT_PATH` env → 호스트 워크스페이스 루트(`tryProjectRoot()`) 순, 둘 다 없으면 throw (BLOCKED_PREFIXES 검사)
- `MetadataStore.loadGraph()`로만 그래프 적재
- `invalidateCache()` 시 queryCache도 함께 무효화

### Ask first

- BLOCKED_PREFIXES 변경 (보안 영향)
- 캐시 키 정책 변경 (단일 vault → multi vault 등)

### Never do

- 모듈 외부에서 cachedGraph / cacheVaultPath 직접 조작
- ensureFreshGraph가 in-flight rebuild를 await
- vault 경로를 환경변수 / 호스트 워크스페이스 루트 외 경로에서 가져오기 (claude 외 호스트에서 `process.cwd()` 폴백 금지)
