# graphCache — Contract

## Requirements

- vault 경로 결정과 in-memory `KnowledgeGraph` 보관, 이 두 가지만 소유한다. read-path freshness gating 은 형제 organ `middlewares` 의 `ensureFreshGraphNonBlocking` 이 소유하고 호출자가 그쪽을 직접 쓴다 — 여기서 감싸면 두 모듈이 서로를 참조해 순환이 된다.
- vault 경로는 `getVaultPath()` 한 곳에서만 나온다. 해석 순서는 `MAENCOF_VAULT_PATH` 환경변수 → 호스트 워크스페이스 루트(`tryProjectRoot()`) 이고, 둘 다 없으면 환경변수를 세우라는 안내와 함께 throw 한다. Claude 외 호스트에서 `process.cwd()` 로 조용히 폴백하지 않는다 — 잘못된 디렉터리를 vault 로 오인하면 그 자리에 지식 트리를 만든다.
- 해석된 경로가 공통 host registry의 상태 루트 또는 `~/.config`와 같거나 그 하위면 거부한다. 환경 override를 포함한 root와 target을 canonicalize한 뒤 디렉터리 경계로 비교해 symlink·상대경로·`..` 우회는 막고 이름만 비슷한 sibling은 허용한다. canonicalization 판정 오류는 허용으로 바꾸지 않는다.
- 그래프 적재는 `MetadataStore.loadGraph()` 로만 한다. 캐시는 (그래프, 그 그래프를 적재한 vault 경로) 한 쌍이며, 요청 경로가 캐시된 경로와 다르면 캐시를 쓰지 않는다.
- 적재가 `null` 을 돌려주면 캐시하지 않는다. 인덱스가 아직 없는 vault 에서 `null` 을 캐시하면 이후 빌드 결과를 못 보게 된다.
- `invalidateCache()` 는 그래프 캐시와 `queryCache` 를 함께 비운다. 그래프만 비우면 SA 결과 캐시가 옛 그래프 기준 답을 계속 낸다.
- 캐시 상태(`cachedGraph` / `cacheVaultPath`)는 모듈 내부다. 배럴이 노출하는 세 함수 밖에서 직접 조작하지 않는다.

## API Contracts

캐시는 단일 vault 슬롯이다. multi-vault를 도입하면 캐시 키와 background rebuild mutex를 함께 재설계해야 한다. freshness gating을 여기서 래핑하면 상호 참조 순환이 생기므로 호출자가 해당 미들웨어를 직접 쓴다.

## Acceptance Criteria

### AC-null-not-cached — 부재 미캐시

- 적재 결과가 `null` 이면 캐시에 남지 않아 다음 호출이 다시 시도한다.

### AC-invalidate-clears-query-cache — query 캐시 동반 무효화

- `invalidateCache()` 호출 후 SA query 캐시도 비어 있다.

## Last Updated

vault 경로의 안전 경계, 캐시 슬롯 소유권 또는 queryCache 동반 무효화 계약이 바뀔 때 갱신한다.
