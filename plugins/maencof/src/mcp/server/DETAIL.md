# server

## Requirements

- freshness read는 현재 그래프를 부분 갱신하되 진행 중인 전체 rebuild를 await하지 않는다. plain read를 인덱스 상태에 묶지 않는다.
- mutate 성공은 영향 경로의 stale 기록과 사용량 통계를 수행하고 누적 임계에서 background rebuild를 트리거한다. move는 소스 삭제와 대상 변경을 모두 기록해야 한다.
- 부팅 시 transport connect 뒤에 shutdown 등록을 먼저 하고, 이어지는 sweep·외부 변경 감지·필요한 rebuild 체인은 detach하여 서버 기동을 막지 않는다. 등록이 앞서야 정리 체인이 도는 동안 종료되어도 자기 세션의 best-effort 마감이 걸려 있다.
- 두 rebuild 경로(explicit `kg_build` / background) 모두 성공 시 `refreshTurnContextSafe(vaultPath)` 로 훅 주입용 turn-context 스냅샷을 재빌드한다 — 매 턴 `<kg-core>` 요약이 자신이 요약하는 디스크 인덱스를 따라가게 하는 동일 계약의 확장 (best-effort, 실패는 error-log).
- turn-context 갱신 실패는 error-log로 격리한다. 이 부수 작업이 빌드 성공을 실패로 바꾸지 않아야 한다.

## API Contracts

read 경로는 진행 중인 background rebuild를 await하지 않는다. 현재 그래프의 부분 갱신과 전체 재빌드를 분리해 응답 지연을 제한한다.

두 rebuild 경로의 성공은 그래프 캐시 무효화와 turn-context 재생성을 함께 수행해야 한다. 디스크만 바꾸면 같은 세션의 읽기와 매 턴 주입이 오래된 인덱스를 계속 보여 준다.

- Stale 영속 스키마: `{ entries: { path, op:'mutate'|'delete' }[], updatedAt }`. 레거시 `{ paths }` 는 자동으로 `op='mutate'` 로 승격.
- 부분 재색인은 node-level weights·PageRank를 재계산하지 않는다. 이 값들은 background rebuild에 의존한다.
- in-place 갱신은 builtAt을 바꾸지 않으므로 실제 변경이 적용되면 queryCache도 무효화해야 한다. 그렇지 않으면 같은 캐시 키가 옛 SA 결과를 재사용한다.
- read 1회 처리량은 `READ_REINDEX_CAP` 로 제한 (가장 최근 항목 우선 `slice(-N)`; 초과분은 background rebuild 가 흡수). bg rebuild trigger 는 별개 `STALE_REBUILD_THRESHOLD` 로 통제 — 두 상수는 동일 값이라도 의미가 다르므로 항상 별도 import.
- stale 정보는 인덱서 내부 상태 — LLM 컨텍스트, 도구 응답, 진단 외 표면에 노출 금지.

## Acceptance Criteria

### AC-turn-context-follows-index — turn-context 동기

- 두 rebuild 경로 모두 성공 시 `refreshTurnContextSafe` 로 훅 주입용 스냅샷을 재빌드한다 (best-effort, 실패는 error-log).

### AC-boot-never-blocks — 부팅 비차단

- `startServer` 가 transport connect 뒤의 bootSweep → vaultWalk → boot rebuild 체인을 await 하지 않고, 각 단계는 대상이 없으면 no-op 으로 지나간다.

### AC-read-never-awaits-rebuild — read 비차단

- freshness 가 필요한 read 도구가 진행 중인 rebuild 를 await 하지 않고 현재 graph reference 로 응답한다.

### AC-stale-not-exposed — stale 비노출

- `kg_status` 진단 응답을 제외한 도구 응답에 stale 메타정보가 담기지 않는다.

## Last Updated

비차단 부팅·read·부분 재색인 계약의 의미가 바뀔 때 갱신한다.
