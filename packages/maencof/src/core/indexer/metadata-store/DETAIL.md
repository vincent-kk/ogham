# metadata-store

## Requirements

- 5 함수(`appendStaleNodes` / `clearStaleNodes` / `saveSnapshot` / `saveGraph` / `saveWeights`)는 atomic write+rename + per-vault mutex로 직렬화한다.
- 단일 프로세스: vault path별 `withVaultLock`이 중첩 호출을 직렬 chain으로 묶어 race를 차단한다.
- 다중 프로세스: tmp 파일(`${path}.tmp.${pid}.${rand}`) 작성 후 `fs.rename`으로 partial write 0. rename 충돌 시 retry 3회 × 50ms backoff.
- `appendStaleNodes` retry 시: load → merge (집합 합집합 보존) → atomic write를 다시 시도.
- `usage-stats` increment는 commutative이며 윈도우가 5ms 이하라 극단 contention에서 +1 손실을 허용한다 (통계 SLA 영향 없음, 명시 문서화).
- `snapshot` / `graph` / `weights`는 마지막 writer 우선이며 항상 일관 상태를 보장한다.
- 모든 함수 시그니처는 불변 — 호출부(MCP middlewares, kg-build 등) 영향 0.

## API Contracts

- `new MetadataStore(vaultPath)` — `${vaultPath}/.maencof/`에 캐시 파일 R/W.
- `loadGraph()` / `saveGraph(graph)` — `index.json`.
- `loadWeights()` / `saveWeights(data)` — `weights.json`.
- `loadSnapshot()` / `saveSnapshot(snapshot)` — `snapshot.json`.
- `loadStaleNodes()` / `appendStaleNodes(paths)` / `clearStaleNodes()` — `stale-nodes.json`.
- 헬퍼: `atomic-write.ts::atomicWriteJson(absPath, data)`, `file-mutex.ts::withVaultLock(vaultPath, fn)`.

## Failure policy

- atomic rename 3회 retry 모두 실패 시 throw — 호출자가 retry 정책 결정.
- load 실패는 silent (빈/기본 결과 반환), 모든 unexpected error는 `appendErrorLogSafe`로 흘림.
