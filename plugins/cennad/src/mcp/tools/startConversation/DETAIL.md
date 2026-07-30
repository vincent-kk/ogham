# startConversation — Contract

## Requirements

- cennad `session_id`(UUIDv4)를 발급하고 dispatcher 로 codex·antigravity·claude CLI 를 호출한 뒤 결과를 `ConversationResponse` 로 직조한다.
- **외부 CLI 가 실패해도 `session_id` 디스크 기록은 유지한다** — 실패한 시도도 이어서 조사할 수 있어야 한다.
- 프롬프트 prefix 합성(`composePrompt`)은 여기서 1회 수행하고 dispatcher 에는 합성된 문자열만 넘긴다.
- 권한 플래그는 config 채널로만 온다 — 도구 입력에 노출하지 않는다.

## API Contracts

- `handleStartConversation(...)` — 새 세션을 만들고 `ConversationResponse` 를 돌려준다.

## Acceptance Criteria

### AC-session-persisted-on-failure — 실패 시에도 세션 기록

- CLI 실패 응답에서도 `session_id` 가 발급되고 디스크에 남는다.

### AC-prompt-composed-once — 합성 1회

- dispatcher 가 받는 프롬프트가 이미 합성된 문자열이다.

## Last Updated

2026-07-30 — 세션 시작 도구 계약을 문서화했다.
