# errorMap — Contract

## Requirements

- 외부 CLI 의 exit code, stderr 패턴, 구조화 출력의 실패 메시지(`cliMessage`), Node 에러 코드를 하나의 `ErrorCode` 값으로 정규화한다.
- **dispatcher 어디에서도 `ErrorCode` 를 독자적으로 결정하지 않는다.** 이 모듈이 유일한 매핑 계층이다.
- `ErrorCode` 값집합은 `auth`·`rate_limit`·`network`·`timeout`·`cli_error`·`cancelled`·`budget_exhausted`·`disabled`·`unknown` 이다.
- 의도된 중단(`cancelled`)은 코드도 메시지도 버퍼에 남은 출력을 쓰지 않는다 — 중단 시점에 하던 일은 중단 사유가 아니다.
- 어디에도 해당하지 않는 신호는 `unknown` 으로 남긴다 — 추측해서 더 구체적인 코드를 붙이지 않는다.

## API Contracts

- 에러 정규화 — CLI 종료 정보와 메시지를 받아 `ErrorCode` 를 돌려준다.

## Acceptance Criteria

### AC-single-mapping-point — 단일 매핑 지점

- dispatcher 하위에서 `ErrorCode` 리터럴을 직접 판정하는 코드가 이 모듈 밖에 없다.

### AC-unknown-fallback — 미분류 보존

- 알려진 패턴에 맞지 않는 실패가 `unknown` 으로 분류되고 다른 코드로 오분류되지 않는다.

## Last Updated

2026-07-31 — `cancelled` 를 값집합에 더하고, 그 코드가 버퍼 출력을 메시지로 인용하지 않는다는 조건을 명시했다.
