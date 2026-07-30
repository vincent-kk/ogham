# stopConversation — Contract

## Requirements

- 실행 중인 provider CLI 를 즉시 종료하고, 무엇을 죽였는지 호출자에게 돌려준다.
- 필터 없는 호출은 이 서버 프로세스의 in-flight 실행 전부를 대상으로 한다.
- 대상이 없어도 실패가 아니다 — 개수 0 과 그 이유를 담은 정상 응답을 돌려준다.

## API Contracts

- `handleStopConversation(input)` — `{ session_id?, provider? }` → `{ stopped, count, message }`.
- 중단 자체는 `dispatcher` 의 `stopRuns` 가 수행한다. 이 도구는 필터 해석과 결과 요약만 맡는다.

## Acceptance Criteria

### AC-filter-selection — 대상 선택

- 필터 없음 → 원장의 모든 실행이 중단된다.
- `session_id` 또는 `provider` 단독 → 해당 실행만 중단되고 나머지는 건드리지 않는다.
- 두 필터 동시 → 둘 다 만족하는 실행만 중단된다.

### AC-empty-is-not-failure — 빈 결과

- 매칭되는 실행이 없으면 `count: 0`, `stopped: []` 과 이유를 담은 `message` 를 돌려주고 throw 하지 않는다.

### AC-process-scope — 사정권

- 원장에 없는 실행(다른 세션이 띄운 CLI)은 보고되지도 종료되지도 않는다.

## Last Updated

2026-07-31 — 강제 종료 도구 계약을 문서화했다. 손자 프로세스까지 닿는 그룹 종료는 spawn 레이어의 `detached: true` 가 보장하며, 이 도구는 그 종료를 발화시키는 표면이다.
