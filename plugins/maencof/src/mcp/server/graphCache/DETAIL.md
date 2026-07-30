# graphCache — Contract

## Requirements

- vault 경로 결정과 in-memory `KnowledgeGraph` 보관, 이 두 가지만 소유한다. read-path freshness gating 은 형제 organ `middlewares` 의 `ensureFreshGraphNonBlocking` 이 소유하고 호출자가 그쪽을 직접 쓴다 — 여기서 감싸면 두 모듈이 서로를 참조해 순환이 된다.
- vault 경로는 `getVaultPath()` 한 곳에서만 나온다. 해석 순서는 `MAENCOF_VAULT_PATH` 환경변수 → 호스트 워크스페이스 루트(`tryProjectRoot()`) 이고, 둘 다 없으면 환경변수를 세우라는 안내와 함께 throw 한다. Claude 외 호스트에서 `process.cwd()` 로 조용히 폴백하지 않는다 — 잘못된 디렉터리를 vault 로 오인하면 그 자리에 지식 트리를 만든다.
- 해석된 경로가 `~/.claude` 또는 `~/.config` 로 시작하면 거부한다. 전역 설정 디렉터리를 vault 로 다루면 MCP 도구가 사용자 설정을 문서처럼 쓰고 지운다.
- 그래프 적재는 `MetadataStore.loadGraph()` 로만 한다. 캐시는 (그래프, 그 그래프를 적재한 vault 경로) 한 쌍이며, 요청 경로가 캐시된 경로와 다르면 캐시를 쓰지 않는다.
- 적재가 `null` 을 돌려주면 캐시하지 않는다. 인덱스가 아직 없는 vault 에서 `null` 을 캐시하면 이후 빌드 결과를 못 보게 된다.
- `invalidateCache()` 는 그래프 캐시와 `queryCache` 를 함께 비운다. 그래프만 비우면 SA 결과 캐시가 옛 그래프 기준 답을 계속 낸다.
- 캐시 상태(`cachedGraph` / `cacheVaultPath`)는 모듈 내부다. 배럴이 노출하는 세 함수 밖에서 직접 조작하지 않는다.

## API Contracts

### Entry point (`index.ts`)

- `getVaultPath(): string` — 해석 + 차단 검사. 결과는 절대 경로로 정규화된다. 해석 불가 또는 차단 접두사면 throw.
- `loadGraphIfNeeded(vaultPath): Promise<KnowledgeGraph | null>` — 같은 vault 경로의 캐시가 있으면 그것을, 없으면 디스크에서 적재해 캐시한 뒤 반환. 인덱스가 없으면 `null`.
- `invalidateCache(): void` — 그래프 캐시 + query 캐시 무효화.

### 차단 접두사

`~/.claude` · `~/.config` (홈 경로는 `@ogham/cross-platform/paths` 의 `home()` 기준). 목록 변경은 보안 영향이 있어 `INTENT.md` 의 "Ask first" 대상이다.

### 단일 vault 가정

캐시는 vault 경로 하나를 키로 잡는 단일 슬롯이다. multi-vault 를 도입하면 이 슬롯과 `middlewares` 의 background rebuild mutex 를 함께 재설계해야 한다.

## Acceptance Criteria

### AC-vault-path-single-source — vault 경로 단일 출처

- 경로 결정이 환경변수와 호스트 워크스페이스 루트 두 곳에서만 오고, 둘 다 없으면 throw 한다.

### AC-blocked-prefixes — 전역 설정 차단

- 해석 결과가 차단 접두사 아래면 그래프를 적재하지 않고 throw 한다.

### AC-cache-keyed-by-vault — vault 별 캐시

- 캐시된 경로와 다른 vault 로 호출하면 캐시를 재사용하지 않고 다시 적재한다.

### AC-null-not-cached — 부재 미캐시

- 적재 결과가 `null` 이면 캐시에 남지 않아 다음 호출이 다시 시도한다.

### AC-invalidate-clears-query-cache — query 캐시 동반 무효화

- `invalidateCache()` 호출 후 SA query 캐시도 비어 있다.

## Last Updated

2026-07-30 — vault 경로 단일 출처·전역 설정 차단·vault 별 캐시 키·query 캐시 동반 무효화 계약을 문서화했다.
