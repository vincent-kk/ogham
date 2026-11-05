# cacheManager — Contract

## Requirements

- 캐시 좌표는 해시로 파생한다: `cwdHash` 가 프로젝트를, `sessionIdHash` 가 세션을 가른다. 호출자가 경로를 직접 조립하지 않는다.
- 캐시 부재는 정상이다. read 는 빈 값으로 degrade 하고 throw 하지 않는다 — 캐시는 재생성 가능한 파생물이다.
- prompt-scope 와 turn-scope 는 수명이 다르다. 세션 마커·prompt 정리와 turn-context 정리를 분리해 각 수명을 보존한다.
- 만료 정책은 여기 있지 않다. `pruneOldSessions` 는 호출자가 준 기준으로만 지운다.

## API Contracts

캐시 좌표는 공통 해시 함수에서 파생하여 훅과 MCP가 다른 파일을 보지 않게 한다.

## Acceptance Criteria

구체 동작의 수용 기준은 테스트가 고정하며, 공통 경계와 설계 이유는 위 계약을 따른다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 훅과 MCP 가 같은 캐시 파일을 읽고 쓰므로 좌표 파생을 훅 쪽에서 다시 구현하면 두 경로가 어긋난다.

## Last Updated

캐시 좌표·수명 구분·만료 정책이 바뀔 때 갱신한다.
