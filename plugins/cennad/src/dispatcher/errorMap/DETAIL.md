# errorMap — Contract

## Requirements

- 외부 CLI 의 exit code, stderr 패턴, 구조화 출력의 실패 메시지(`cliMessage`), Node 에러 코드를 하나의 `ErrorCode` 값으로 정규화한다.
- CLI 가 보고한 실패 신호(exit code, stderr 패턴, 구조화 출력의 실패 메시지, Node 에러 코드, 취소)의 `ErrorCode` 는 종료 코드와 무관하게 이 모듈만 결정한다 — 같은 진단이 어댑터마다 다른 코드로 갈리는 것을 막는다. 어댑터가 직접 코드를 고르는 경우는 CLI 가 사유를 보고하지 않은 출력 계약 위반 두 가지뿐이다: Codex 세션 참조 누락의 `unknown`, 복구할 수 없는 Antigravity 빈 출력의 `cli_error`.
- `ErrorCode` 값집합은 `auth`·`rate_limit`·`network`·`timeout`·`cli_error`·`cancelled`·`budget_exhausted`·`disabled`·`unknown` 이다.
- 의도된 중단(`cancelled`)은 코드도 메시지도 버퍼에 남은 출력을 쓰지 않는다 — 중단 시점에 하던 일은 중단 사유가 아니다.
- 어디에도 해당하지 않는 신호는 `unknown` 으로 남긴다 — 추측해서 더 구체적인 코드를 붙이지 않는다.

## API Contracts

- 에러 정규화 — CLI 종료 정보와 메시지를 받아 `ErrorCode` 를 돌려준다.

## Acceptance Criteria

### AC-single-mapping-point — 단일 매핑 지점

- CLI 가 보고한 실패 신호의 분류가 어댑터에 중복되지 않는다. 직접 코드는 Codex 세션 참조 누락의 `unknown` 과 복구 불가능한 Antigravity 빈 출력의 `cli_error` 에 한정한다.

## Last Updated

오류 분류 소유권·진단 출처·중단 우선순위의 내용이나 적용 범위가 바뀔 때 갱신한다.
