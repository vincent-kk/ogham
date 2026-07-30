# tools — Contract

## Requirements

- 도구는 넷이며 각각 독립 서브 fractal 이다.
- 도구 인자 이름은 snake_case 다 — 외부 LLM 인터페이스이기 때문이다.
- 대화 도구(`startConversation`·`continueConversation`)의 응답은 `ConversationResponse` 표준을 따른다. 조작 도구(`stopConversation`·`openSettings`)는 조작 결과를 담은 자체 shape 을 쓴다 — 대화가 아닌 것을 대화 envelope 에 넣으면 `session_id`·`turn` 같은 의미 없는 칸을 채워야 한다.
- 핸들러에서 `process.exit` 를 직접 호출하지 않는다.

## API Contracts

- `startConversation/` — 새 외부 LLM 세션 시작. `session_id`(UUIDv4)를 발급한다.
- `continueConversation/` — 기존 세션 이어 호출. `project_hash` 검증을 거친다.
- `stopConversation/` — 실행 중인 provider CLI 강제 종료. `{ stopped, count, message }` 반환.
- `openSettings/` — 설정 웹 UI 기동. `{ url, message, reused }` 반환.

## Acceptance Criteria

### AC-response-standard — 응답 표준

- 대화 도구 둘이 `ConversationResponse` 형태로 응답한다.
- 조작 도구의 응답은 자체 shape 이며 `ConversationResponse` 를 흉내 내지 않는다.

### AC-snake-case-input — 입력 명명

- 도구 입력 키가 전부 snake_case 다.

## Last Updated

2026-07-31 — `stopConversation` 을 더해 도구 넷으로 갱신하고, 응답 표준을 대화 도구와 조작 도구로 나눴다. `openSettings` 는 처음부터 자체 shape 이었으므로 이 구분은 기존 동작을 기술한 것이다.
