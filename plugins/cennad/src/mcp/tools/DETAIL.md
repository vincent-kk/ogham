# tools — Contract

## Requirements

- 도구는 셋이며 각각 독립 서브 fractal 이다.
- 도구 인자 이름은 snake_case 다 — 외부 LLM 인터페이스이기 때문이다.
- 응답은 모두 `ConversationResponse` 표준을 따른다. 도구마다 형태를 다르게 하지 않는다.
- 핸들러에서 `process.exit` 를 직접 호출하지 않는다.

## API Contracts

- `startConversation/` — 새 외부 LLM 세션 시작. `session_id`(UUIDv4)를 발급한다.
- `continueConversation/` — 기존 세션 이어 호출. `project_hash` 검증을 거친다.
- `openSettings/` — 설정 웹 UI 기동.

## Acceptance Criteria

### AC-response-standard — 응답 표준

- 세 도구가 모두 `ConversationResponse` 형태로 응답한다.

### AC-snake-case-input — 입력 명명

- 도구 입력 키가 전부 snake_case 다.

## Last Updated

2026-07-30 — 도구 컨테이너 계약을 문서화했다.
