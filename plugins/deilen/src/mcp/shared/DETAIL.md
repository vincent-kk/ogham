# shared — Contract

## Requirements

- 도구 핸들러는 평문 데이터를 반환하고, MCP 결과 직렬화는 이 모듈이 전담한다.
- 핸들러가 던진 값은 서버를 죽이지 않고 에러 봉투가 된다.
- `extra.signal` 은 항상 핸들러에 전달한다 — `collect_feedback` 의 long-poll abort 가 이것에 의존한다.
- 이미 `CallToolResult`(content 배열) 형태인 결과는 다시 감싸지 않는다.

## API Contracts

- 이미 content를 담은 MCP 결과는 그대로 통과시킨다. 이미지 등을 포함한 결과를 JSON text로 다시 감싸서는 안 된다.
- 반환 타입과 오류 문자열 형식은 구현과 테스트를 읽는다.

## Acceptance Criteria

### AC-handler-envelope — 응답 봉투 일관성

- 평문 반환값은 단일 JSON text content 로 직렬화된다.
- 핸들러가 던진 값은 `isError: true` 봉투가 되고 예외는 밖으로 새지 않는다.
- 이미 content 형태인 결과는 이중 포장되지 않는다.

### AC-signal-passthrough — 취소 신호 전달

- `extra.signal` 이 핸들러까지 도달해 long-poll 이 abort 될 수 있다.

## Last Updated

MCP 직렬화·content 통과·취소 신호 전달 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
