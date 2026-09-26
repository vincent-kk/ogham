# server — Contract

## Requirements

- 등록된 도구 스키마는 호출 여부와 무관하게 매 턴 컨텍스트로 나간다 — **여기 있는 도구 개수가 곧 상시 비용**이다.
- 모든 핸들러는 `wrapHandler` 로 감싸 throw 를 오류 결과로 바꾼다.
- 결과 직렬화는 compact JSON 이다. 컨텍스트로 나가는 바이트를 늘리지 않는다.
- stdio 가 유일한 transport 다.
- `settings` 의 `action: 'config'` 는 `off`·`advisory`·`standard`·`strict` 네 다이얼 값을 받으며, `off` 는 skills-only 런타임 밸브다.

## API Contracts

- `lifecycle/` — `createServer`(서버 생성 + 도구 3개 등록), `startServer`(stdio 연결).
- `serialization/` — `toolResult`(compact JSON), `wrapHandler`(throw → 오류 결과).

## Acceptance Criteria

### AC-tool-count — 도구 개수 고정

- 등록 도구가 정확히 3개이고 각각 `wrapHandler` 를 거친다. workflow의 project_root는 필수 절대경로이고 task는 kebab-case다. start/resume은 intent가 필요하다. off/advisory에서 disabled, 나머지에서 accepted를 반환한다. accepted는 hook ACK와 구별된다.

### AC-compact-serialization — 응답 크기

- 도구 결과가 compact JSON 으로 직렬화된다.

## Last Updated

2026-09-26 — 명시적 조건부 참여와 비차단 호스트 계약을 반영했습니다.
