# server — Contract

## Requirements

- stdio transport 로만 통신한다. stdout 직접 쓰기를 하지 않고 로그는 stderr 로만 보낸다.
- 도구 입력 스키마는 소스의 types organ이 소유하고 MCP SDK가 검증한다. 서버 등록부에 스키마를 다시 정의하지 않아 입력 계약의 소유권을 한곳에 유지한다.
- 모든 `registerTool` 콜백은 `wrapHandler` 로 감싼다.
- 이 fractal 의 외부 소비자는 배럴을 경유한다 — 내부 구현 파일을 직접 참조하지 않는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-registration — 등록 규약

- 등록 도구가 정확히 5개이고 각 콜백이 `wrapHandler` 를 거친다.

### AC-stdout-reserved — stdout 보호

- 서버 코드가 stdout 에 직접 쓰지 않는다.

### AC-barrel-crossing — 경계 통과

- 이 fractal 밖에서 `server.ts` 를 직접 import 하지 않는다.

## Last Updated

도구 등록·입력 검증과 stdio 통신 계약이 바뀔 때 갱신한다.
