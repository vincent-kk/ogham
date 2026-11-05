# tools — Contract

## Requirements

- 도구는 넷이며 각각 독립 서브 fractal 이다.
- 도구 인자 이름은 snake_case 다 — 외부 LLM 인터페이스이기 때문이다.
- 대화 도구(`startConversation`·`continueConversation`)의 응답은 `ConversationResponse` 표준을 따른다. 조작 도구(`stopConversation`·`openSettings`)는 조작 결과를 담은 자체 shape 을 쓴다 — 대화가 아닌 것을 대화 envelope 에 넣으면 `session_id`·`turn` 같은 의미 없는 칸을 채워야 한다.
- 핸들러에서 `process.exit` 를 직접 호출하지 않는다.

## API Contracts

- 대화의 성공·실패는 대화 envelope로 표현하고, 중단·설정 열기는 조작 결과로 표현한다. 무의미한 세션·턴 필드를 만들지 않는다.

## Acceptance Criteria

### AC-response-standard — 응답 표준

- 대화 도구 둘이 `ConversationResponse` 형태로 응답한다.
- 조작 도구의 응답은 자체 shape 이며 `ConversationResponse` 를 흉내 내지 않는다.

### AC-snake-case-input — 입력 명명

- 도구 입력 키가 전부 snake_case 다.

## Last Updated

대화와 조작 응답의 구분·도구 간 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
