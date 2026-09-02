# server — Contract

## Requirements

- 등록된 도구 스키마는 호출 여부와 무관하게 매 턴 컨텍스트로 나간다 — **여기 있는 도구 개수가 곧 상시 비용**이다.
- 모든 핸들러는 `wrapHandler` 로 감싸 throw 를 오류 결과로 바꾼다.
- 결과 직렬화는 compact JSON 이다. 컨텍스트로 나가는 바이트를 늘리지 않는다.
- stdio 가 유일한 transport 다.
- `rule_docs_sync`의 config action은 `off`·`advisory`·`standard`·`strict` 네 다이얼 값을 받으며, `off`는 skills-only 런타임 밸브다.

## API Contracts

- `lifecycle/` — `createServer`(서버 생성 + 도구 3개 등록), `startServer`(stdio 연결).
- `serialization/` — `toolResult`(compact JSON), `wrapHandler`(throw → 오류 결과).

## Acceptance Criteria

### AC-tool-count — 도구 개수 고정

- 등록 도구가 정확히 3개이고 각각 `wrapHandler` 를 거친다.

### AC-compact-serialization — 응답 크기

- 도구 결과가 compact JSON 으로 직렬화된다.

## Last Updated

2026-09-03 — config action의 `off` 다이얼 입력 계약을 추가했다.
