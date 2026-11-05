# configGet — Contract

## Requirements

- MCP 도구 `config_get` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 이 도구가 보는 것은 **유효 설정** 하나다 — `loadConfig` 가 user 계층 위에 project 계층을 얹어 만든 값이며, 어느 계층이 그 값을 말했는지는 구분하지 않는다. 계층별 값이 필요한 소비자는 설정 페이지(`open_settings`)의 `configByScope` 를 쓴다.
- 설정 파일이 두 계층 모두 없어도 실패가 아니다 — 스키마 기본값으로 채운 설정을 반환한다. 이는 첫 실행의 정상 상태다.
- 읽기 전용이다. 조회가 설정 파일을 만들거나 고치지 않는다(`readOnlyHint: true`).

## API Contracts

- 누락한 dot-path 값은 undefined이며 MCP JSON에서는 value 키가 빠진다. 부재를 명시적 null로 오인하지 않는다.
- dot-path는 문자열 세그먼트 조회이며 와일드카드나 배열 인덱스 표기를 해석하지 않는다.
- 병합 설정이 스키마를 벗어나면 조회가 실패한다.

## Acceptance Criteria

구체 판정과 입력별 결과는 이 모듈의 테스트가 고정한다.

## Last Updated

유효 설정 조회·부재·오류 계약의 내용과 근거가 바뀔 때 갱신한다.
