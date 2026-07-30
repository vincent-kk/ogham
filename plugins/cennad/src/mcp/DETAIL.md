# mcp — Contract

## Requirements

- 서버 이름은 `tools` 이며 도구 4종(`start_conversation`·`continue_conversation`·`stop_conversation`·`open_settings`)을 stdio 로 노출한다.
- 모든 핸들러는 공유 래퍼를 거쳐 throw 를 응답 envelope 로 바꾼다.
- 권한 플래그(`yolo`·`sandbox`)는 config 단독 채널이다 — MCP 입력으로 노출하지 않는다.
- 프롬프트 prefix 합성(`composePrompt`)은 MCP 진입에서 1회 수행하고, dispatcher 는 합성된 문자열만 받는다.

## API Contracts

- `server/` — 서버 생성·도구 등록·stdio 연결.
- `serverEntry/` — `bridge/mcp-server.cjs` 번들 진입점.
- `tools/` — 도구 4종.
- `shared/` — 응답 envelope 직렬화와 try/catch 래퍼.
- `pages/` — 설정 UI 프런트엔드 소스.

## Acceptance Criteria

### AC-tool-registration — 도구 등록

- 등록 도구가 정확히 4개이며 각 핸들러가 공유 래퍼를 거친다.

### AC-permission-channel — 권한 채널 분리

- MCP 입력 스키마에 `yolo`·`sandbox` 가 없다.

### AC-prompt-composition-once — 합성 1회

- prefix 합성이 MCP 진입에서만 일어나고 dispatcher 에서 반복되지 않는다.

## Last Updated

2026-07-31 — 실행 중단 도구 `stop_conversation` 을 더해 도구 4종으로 갱신했다. 조작 도구는 대화 envelope 을 쓰지 않는다.
