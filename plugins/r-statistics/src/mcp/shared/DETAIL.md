# shared — Contract

## Requirements

- MCP 직렬화는 이 경계에서 전담하고 핸들러는 평문 데이터를 반환한다.
- 핸들러 throw를 오류 봉투로 바꾸어 개별 도구 실패가 서버 전체를 끝내지 않게 한다.

## API Contracts

- 평문 데이터는 JSON content로, throw는 오류 봉투로 변환한다. 이미 MCP content인 결과는 다시 포장하지 않는다.
- 호출 문맥과 취소 신호를 핸들러까지 보존한다. 래퍼가 호출자의 취소 의사를 제거하지 않게 한다.

## Acceptance Criteria

### AC-handler-envelope — 응답 봉투 일관성

- 평문 반환값은 단일 JSON text content 로 직렬화된다.
- 핸들러가 던진 값은 `isError: true` 봉투가 되고 예외는 밖으로 새지 않는다.
- 이미 content 형태인 결과는 이중 포장되지 않는다.

## Last Updated

응답 직렬화·오류 봉투·호출 문맥 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
