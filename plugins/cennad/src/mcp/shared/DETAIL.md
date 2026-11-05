# shared — Contract

## Requirements

- 도구 응답은 `toolResult` 로 compact JSON 직렬화한다. 디버그 시에만 `CENNAD_PRETTY_JSON=1` 로 확장한다.
- `wrapHandler`는 도메인 응답을 합성하지 않는다. 대화 실패는 대화 핸들러가 `ConversationResponse`로 반환하고, 비정상 throw는 공통 MCP 오류로 감싼다.
- 모든 도구가 MCP content 직렬화를 공유하되 도메인 결과는 각 핸들러가 소유한다 — 중단·설정 조작을 대화 응답으로 강제하면 소비자의 결과 계약이 깨진다.
- 오래 걸리는 호출은 주기적 progress notification 으로 호스트의 idle 판정을 피한다. 호스트는 응답도 progress 도 없이 idle 한도를 넘긴 호출을 중단시키는데, provider CLI 는 tier 에 따라 몇 시간을 돌 수 있고 그동안 이 서버는 아무것도 보내지 않는다. 호스트가 `progressToken` 을 주지 않으면 progress 를 받을 의사가 없다는 뜻이므로 아무것도 보내지 않는다.
- 하트비트는 모든 도구가 통과하는 `wrapHandler`가 소유한다. 도구별 반복 구현은 누락된 도구만 호스트 idle 한도에서 잘리게 하므로 허용하지 않는다.

## API Contracts

- 정상 응답의 도메인 의미는 각 핸들러가 소유한다. 래퍼가 대화 실패를 합성하지 않는다.
- progress 헬퍼는 래퍼만 소비하는 내부 구현이다. 도구 핸들러가 직접 호출할 공개 표면으로 만들지 않는다.

## Acceptance Criteria

### AC-envelope-uniformity — 봉투 통일

- 네 도구의 도메인 결과를 변경하지 않고 같은 MCP text content 방식으로 JSON 직렬화한다.

## Last Updated

응답 직렬화 책임·취소 전달·progress 수명 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
