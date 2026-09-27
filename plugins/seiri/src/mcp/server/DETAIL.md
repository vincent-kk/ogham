# server — Contract

## Requirements

- 등록된 도구 스키마는 호출 여부와 무관하게 매 턴 컨텍스트로 나간다 — **여기 있는 도구 개수가 곧 상시 비용**이다.
- 모든 핸들러는 `wrapHandler` 로 감싸 throw 를 오류 결과로 바꾼다.
- 결과 직렬화는 compact JSON 이다. 컨텍스트로 나가는 바이트를 늘리지 않는다.
- stdio 가 유일한 transport 다.
- 연결 직후 `bootSweep`을 한 번 `setImmediate`로 예약하고 기다리지 않는다. `tryProjectRoot()`가 `null`이거나 실패하면 건너뛰며 정리 실패도 서버 시작을 막지 않는다.
- `runtime` 의 `action: 'dial'` 은 `off`·`advisory`·`standard`·`strict` 네 다이얼 값을 받으며, `off` 는 skills-only 런타임 밸브다.

## API Contracts

- `lifecycle/` — `createServer`(서버 생성 + 도구 3개 등록), `startServer`(stdio 연결 후 `bootSweep` 예약), `bootSweep`(유휴 seiri 상태 정리).
- `serialization/` — `toolResult`(compact JSON), `wrapHandler`(throw → 오류 결과).

## Acceptance Criteria

### AC-tool-count — 도구 개수 고정

- 등록 도구가 정확히 3개이고 각각 `wrapHandler` 를 거친다. runtime의 project_root는 필수 절대경로이고 task는 kebab-case다. start/resume은 intent가 필요하고 `step`의 intent는 생략 시 유도된다. 참여 액션은 off/advisory에서 disabled, 나머지에서 accepted를 반환하며, `dial`은 유효 다이얼과 무관하게 동작한다. accepted는 hook ACK와 구별된다.

### AC-compact-serialization — 응답 크기

- 도구 결과가 compact JSON 으로 직렬화된다.

### AC-boot-sweep — 시작 정리는 비차단이다

- 연결이 끝나야 정리를 예약하며 서버 시작 Promise는 정리 실행을 기다리지 않는다.
- 작업 공간이 없거나 해석에 실패하면 정리를 실행하지 않는다.
- actor와 task 정리는 같은 루트·시각으로 순서대로 실행되며 한쪽 실패가 다른 쪽 실행을 막지 않는다. 예외와 로그를 내보내지 않는다.

## Last Updated

2026-09-27
