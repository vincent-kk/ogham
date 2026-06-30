# metadataStore

## Requirements

- 5 함수(`appendStaleEntries` / `clearStaleEntries` / `saveSnapshot` / `saveGraph` / `saveWeights`)는 atomic write+rename + per-vault mutex로 직렬화한다.
- `saveGraph` 는 단일 `withVaultLock` 안에서 `nodes.json` + `edges.json` 병렬 atomic write → `graph-meta.json` (commit marker) 직렬 atomic write → legacy `index.json` best-effort unlink 순으로 처리한다. 부분 실패 시 graph-meta가 미완 상태이면 `loadGraph` 가 cache miss 로 처리한다.
- 단일 프로세스: vault path별 `withVaultLock`이 중첩 호출을 직렬 chain으로 묶어 race를 차단한다.
- 다중 프로세스: tmp 파일(`${path}.tmp.${pid}.${rand}`) 작성 후 `fs.rename`으로 partial write 0. rename 충돌 시 retry 3회 × 50ms backoff.
- `appendStaleEntries` retry 시: load → merge (집합 합집합 보존) → atomic write를 다시 시도.
- `usageStats` increment는 commutative이며 윈도우가 5ms 이하라 극단 contention에서 +1 손실을 허용한다 (통계 SLA 영향 없음, 명시 문서화).
- `snapshot` / `graph` / `weights`는 마지막 writer 우선이며 항상 일관 상태를 보장한다.
- 모든 함수 시그니처는 불변 — 호출부(MCP middlewares, kgBuild 등) 영향 0.

## API Contracts

- `new MetadataStore(vaultPath)` — `${vaultPath}/.maencof/`에 캐시 파일 R/W.
- `loadGraph()` / `saveGraph(graph)` — 3-shard layout: `nodes.json` + `edges.json` + `graph-meta.json`. `graph-meta.json`이 cross-file commit marker (write LAST, read FIRST). 단일 `withVaultLock` 안에서 nodes/edges 병렬 → graph-meta 직렬로 commit, 성공 후 legacy `index.json`은 best-effort unlink.
- `loadGraph()` 는 디스크에 보존되지 않는 런타임 조회 맵(`adjacencyList` / `edgeWeightMap` / `edgeTypeMap` / `invertedIndex`)을 `graphBuilder.hydrateRuntimeMaps` 로 재수화해 반환한다. 이는 kgBuild 빌드 직후 그래프와 동일한 로직을 공유하므로, 빌드직후/리로드 간 SA·시드 해석 동작이 일치한다. 캐시 파일 구조(3-shard)는 불변 — 맵은 in-memory 파생물이다.
- `loadGraph()` 분기: graph-meta.json 부재 → legacy 마이그레이션 경로 (partial-shard / fresh / legacy-only 포괄). graph-meta.json 존재 + schemaVersion === 2 → fast path. schemaVersion ≠ 2 또는 nodes/edges read 실패 → null (legacy 로 폴백 없음).
- `loadGraph()` legacy fallback — 샤드 commit marker 가 없고 `index.json`만 존재할 경우 1회 자동 마이그레이션 (read → saveGraph → unlink). legacy read 와 saveGraph 사이 잠금이 끊긴 윈도우가 있어 동시 writer 와의 이론적 race 존재 (legacy v1 잔존 1회 한정이라 실측 영향 무시). 이후 호출은 fast path.
- `cacheExists()` — `graph-meta.json` 우선, 없으면 legacy `index.json` 검사.
- `loadWeights()` / `saveWeights(data)` — `weights.json`.
- `loadSnapshot()` / `saveSnapshot(snapshot)` — `snapshot.json`.
- `loadStaleEntries()` / `appendStaleEntries(entries)` / `clearStaleEntries()` — `stale-nodes.json`.
- 헬퍼: `atomicWrite.ts::atomicWriteJson(absPath, data)`, `fileMutex.ts::withVaultLock(vaultPath, fn)`.

## Failure policy

- atomic rename 3회 retry 모두 실패 시 throw — 호출자가 retry 정책 결정.
- load 실패는 silent (빈/기본 결과 반환), 모든 unexpected error는 `appendErrorLogSafe`로 흘림.
