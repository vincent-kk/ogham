# mcp — Contract

## Requirements

- 서버 이름은 `tools` 이며 도구 4종(`start_conversation`·`continue_conversation`·`stop_conversation`·`open_settings`)을 stdio 로 노출한다.
- 모든 핸들러는 공유 래퍼를 거쳐 throw 를 응답 envelope 로 바꾼다.
- 권한 플래그(`yolo`·`sandbox`)는 config 단독 채널이다 — MCP 입력으로 노출하지 않는다.
- 프롬프트 prefix 합성(`composePrompt`)은 MCP 진입에서 1회 수행하고, dispatcher 는 합성된 문자열만 받는다.
- 오래 걸리는 호출은 호스트의 idle 판정에서 살아남아야 한다. 두 겹으로 막는다 — `wrapHandler` 의 progress 하트비트, 그리고 `.mcp.json` 의 per-server `timeout`(호스트가 이 값보다 일찍 idle 로 중단하지 않는 하한이자 벽시계 상한). 어느 한쪽만으로도 성립하지만, 호스트가 `progressToken` 을 주지 않으면 하트비트는 침묵하므로 하한이 안전망이 된다.
- 호스트의 stdio idle 한도가 tier hard cap보다 짧을 수 있으므로 긴 위임에는 progress 하트비트와 per-server timeout을 함께 둔다. progressToken이 없으면 하트비트를 보낼 수 없고, timeout은 벽시계 상한이기도 하므로 무한정 늘리는 대안은 사용하지 않는다.

## API Contracts

- 도구 이름과 입력 표면은 서버 등록부를 읽는다. 권한 설정을 도구 입력으로 넓히는 것은 이 계층의 채널 분리 계약을 바꾼다.

## Acceptance Criteria

### AC-tool-registration — 도구 등록

- 등록 도구가 정확히 4개이며 각 핸들러가 공유 래퍼를 거친다.

### AC-permission-channel — 권한 채널 분리

- MCP 입력 스키마에 `yolo`·`sandbox` 가 없다.

### AC-prompt-composition-once — 합성 1회

- prefix 합성이 MCP 진입에서만 일어나고 dispatcher 에서 반복되지 않는다.

### AC-idle-survival — idle 생존

- 하트비트와 per-server `timeout` 하한이 함께 걸려, 호스트가 tier hard cap 안의 호출을 idle 로 중단시키지 않는다.

## Last Updated

권한 채널·프롬프트 합성·호스트 idle 생존 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
