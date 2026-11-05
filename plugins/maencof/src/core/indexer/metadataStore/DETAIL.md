# metadataStore

## Requirements

- 캐시 변경은 atomic write와 vault별 프로세스 내 mutex를 사용한다. 부분 JSON 노출과 같은 프로세스의 쓰기 경합을 막기 위한 계약이다.
- 그래프 메타데이터는 여러 샤드의 commit marker다. 마지막에 쓰고 먼저 읽어 미완 샤드를 정상 그래프로 취급하지 않는다.
- snapshot·graph·weights는 마지막 writer 우선이며 항상 일관 상태를 보장한다는 정책을 유지한다.
- stale entry의 재시도는 디스크를 다시 읽어 합집합을 병합한다. 같은 실패한 payload만 재전송해 다른 갱신을 잃지 않게 한다.
- usageStats의 손실 허용과 재시도는 소비자인 MCP middleware가 소유한다. 이 저장소의 잠금·원자 쓰기를 재사용하되 측정되지 않은 실행 시간 상한을 저장 계약으로 삼지 않는다.
- 역직렬화는 레이어 경로 게이트 밖 노드와 그 참조 엣지를 제거한다. 규칙 변경이나 오염된 캐시가 비레이어 문서를 그래프로 되살리지 않게 하는 방어선이다.
- 공개 함수 시그니처는 유지한다. 저장 구현 변경이 MCP 소비자 계약을 바꾸지 않게 한다.

## API Contracts

- 런타임 조회 맵은 메모리 파생물이며 빌드 직후와 리로드가 같은 재수화 경로를 사용한다. 서로 다른 구성으로 SA·시드 해석이 달라지지 않게 한다.
- 필수 그래프 샤드와 선택적 archive-members 샤드는 읽기 호환성을 분리한다. 서고 멤버 캐시가 없거나 손상되어도 본 그래프를 읽을 수 있어야 하며, 선택적 기능 때문에 필수 캐시의 호환성을 깨지 않는다. commit marker 부재는 legacy 마이그레이션 또는 cache miss로 처리하며, marker가 있는 캐시의 버전·샤드 오류를 legacy fallback으로 숨기지 않는다.
- legacy read와 새 저장 사이에는 잠금 공백이 있다. 동시 writer가 쓴 신규 데이터를 legacy가 덮을 수 있으나 잔존 v1의 1회 전환에 한정된 이론적 race로 수용한다.
- atomic rename 재시도 소진은 throw하여 호출자가 다음 재시도 정책을 결정한다. load 실패는 빈 결과로 처리하고 unexpected error는 안전 오류 로그로 전달한다는 정책을 유지한다.

## Acceptance Criteria

### AC-commit-marker-first — 커밋 마커 우선

- `graph-meta.json` 이 미완이거나 부재하면 `loadGraph()` 는 부분 샤드를 그래프로 되살리지 않는다 (cache miss 또는 legacy 마이그레이션 경로).

### AC-deserialize-layer-gate — 역직렬화 레이어 게이트

- 캐시에 레이어 디렉토리 밖 경로의 노드가 있어도 역직렬화 결과 그래프에 편입되지 않고, 그 노드를 참조하는 edge 도 남지 않으며 count 가 실제 편입 수와 일치한다.

## Last Updated

캐시 commit·동시성 허용 범위·역직렬화 경계가 바뀔 때 갱신한다.
