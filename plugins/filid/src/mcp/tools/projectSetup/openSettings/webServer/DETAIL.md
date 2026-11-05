# webServer contract

## Requirements

- `project_setup`의 `settings` action이 기동하는 로컬 HTTP 서버다. `127.0.0.1` 전용으로 바인딩한다.
- 요청 검증 순서는 loopback Host → one-time token → POST Origin → `application/json`이다.
- 저장·닫기 이벤트를 settle waiter로 노출해 도구의 bounded long-poll을 해소한다.
- 공유 `@ogham/http-kit`을 쓰고 자체 HTTP 스택을 만들지 않는다.

## API Contracts

- 저장·닫기와 서버 종료는 기다리는 호출을 settle한다. 대기는 bounded이며 취소된 호출을 새 waiter로 보존하지 않는다.

## Acceptance Criteria

### AC-websrv-loopback — loopback 전용

- 비 loopback Host, 잘못된 token, 잘못된 Origin 요청이 모두 거부된다.

## Last Updated

요청 검증 순서, loopback 바인딩이나 settle 대기 계약이 바뀔 때 갱신한다.
