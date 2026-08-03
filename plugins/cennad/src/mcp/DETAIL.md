# mcp — Contract

## Requirements

- 서버 이름은 `tools` 이며 도구 4종(`start_conversation`·`continue_conversation`·`stop_conversation`·`open_settings`)을 stdio 로 노출한다.
- 모든 핸들러는 공유 래퍼를 거쳐 throw 를 응답 envelope 로 바꾼다.
- 권한 플래그(`yolo`·`sandbox`)는 config 단독 채널이다 — MCP 입력으로 노출하지 않는다.
- 프롬프트 prefix 합성(`composePrompt`)은 MCP 진입에서 1회 수행하고, dispatcher 는 합성된 문자열만 받는다.
- 오래 걸리는 호출은 호스트의 idle 판정에서 살아남아야 한다. 두 겹으로 막는다 — `wrapHandler` 의 progress 하트비트, 그리고 `.mcp.json` 의 per-server `timeout`(호스트가 이 값보다 일찍 idle 로 중단하지 않는 하한이자 벽시계 상한). 어느 한쪽만으로도 성립하지만, 호스트가 `progressToken` 을 주지 않으면 하트비트는 침묵하므로 하한이 안전망이 된다.

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

### AC-idle-survival — idle 생존

- 하트비트와 per-server `timeout` 하한이 함께 걸려, 호스트가 tier hard cap 안의 호출을 idle 로 중단시키지 않는다.

## History

- 2026-08-04 — 긴 호출의 idle 생존을 계약에 넣었다. 호스트의 stdio idle 한도(기본 30 분)가 tier hard cap(apex 6 시간)보다 짧아, 그때까지 apex·high·mid 호출은 답을 내기 전에 잘렸다. 하트비트만으로 충분하지 않은 이유는 호스트가 `progressToken` 을 주지 않으면 보낼 수단이 없기 때문이고, `timeout` 하한만으로 충분하지 않은 이유는 그 값이 동시에 벽시계 상한이라 무한정 키울 수 없기 때문이다.

## Last Updated

2026-08-04 — 긴 호출의 idle 생존 요구와 수용 기준을 더했다.
