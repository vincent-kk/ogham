# graphCache

## Purpose

vault 경로 해석 + in-memory KnowledgeGraph 캐시 보관. read-path freshness gating은 [`middlewares`](../middlewares/INTENT.md)의 `ensureFreshGraphNonBlocking`이 소유하며, 호출자는 그쪽을 직접 쓴다 — 여기서 감싸면 두 모듈이 서로를 참조해 순환이 된다.

## Boundaries

### Always do

- `getVaultPath()`로만 vault 경로 결정 — `MAENCOF_VAULT_PATH` env → 호스트 워크스페이스 루트(`tryProjectRoot()`) 순, 둘 다 없으면 throw; 공통 host registry 상태 루트와 `~/.config`를 canonical directory 경계로 차단
- `MetadataStore.loadGraph()`로만 그래프 적재
- `invalidateCache()` 시 queryCache도 함께 무효화

### Ask first

- 차단 root 또는 canonical boundary 정책 변경 (보안 영향)
- 캐시 키 정책 변경 (단일 vault → multi vault 등)

### Never do

- 모듈 외부에서 cachedGraph / cacheVaultPath 직접 조작
- middlewares 재노출·래핑 (freshness gating 호출자는 middlewares를 직접 쓴다)
- vault 경로를 환경변수 / 호스트 워크스페이스 루트 외 경로에서 가져오기 (claude 외 호스트에서 `process.cwd()` 폴백 금지)
- 지원 host 상태 루트·`~/.config` 또는 symlink/상대경로 우회를 vault로 허용
