# shared — Contract

## Requirements

- 도구 응답은 `toolResult` 로 compact JSON 직렬화한다. 디버그 시에만 `CENNAD_PRETTY_JSON=1` 로 확장한다.
- `wrapHandler` 는 **wrap-only** 다 — 비정상 throw 를 흡수할 뿐, 실패 envelope 를 스스로 만들지 않는다. 실패 표현은 핸들러가 `ConversationResponse` 로 돌려준다.
- 모든 도구가 같은 envelope 형태를 쓴다.

## API Contracts

- `toolResult(...)` — compact JSON 직렬화.
- `toolError(...)` — 던져진 값을 오류 결과로 변환.
- `wrapHandler(...)` — throw 흡수 래퍼.

## Acceptance Criteria

### AC-envelope-uniformity — 봉투 통일

- 세 도구의 응답이 같은 형태로 직렬화된다.

### AC-wrap-only — 래퍼 책임 한정

- `wrapHandler` 가 성공 응답의 내용을 바꾸지 않는다.

## Last Updated

2026-07-30 — 응답 직렬화와 래퍼 책임 계약을 문서화했다.
