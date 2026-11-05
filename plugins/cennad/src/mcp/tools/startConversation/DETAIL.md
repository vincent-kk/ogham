# startConversation — Contract

## Requirements

- cennad `session_id`(UUIDv4)를 발급하고 dispatcher 로 codex·antigravity·claude CLI 를 호출한 뒤 결과를 `ConversationResponse` 로 직조한다.
- **외부 CLI 가 실패해도 `session_id` 디스크 기록은 유지한다** — 실패한 시도도 이어서 조사할 수 있어야 한다.
- 프롬프트 prefix 합성(`composePrompt`)은 여기서 1회 수행하고 dispatcher 에는 합성된 문자열만 넘긴다.
- 권한 플래그는 config 채널로만 온다 — 도구 입력에 노출하지 않는다.

## API Contracts

입출력 이름과 형태는 진입점과 검증 코드를 읽는다. 이 문서의 요구사항은 그 표면을 바꿀 때 보존할 정책을 정한다.

## Acceptance Criteria

### AC-session-persisted-on-failure — 실패 시에도 세션 기록

- CLI 실패 응답에서도 `session_id` 가 발급되고 디스크에 남는다.

### AC-prompt-composed-once — 합성 1회

- dispatcher 가 받는 프롬프트가 이미 합성된 문자열이다.

## Last Updated

실패 시 세션 보존·권한 채널·프롬프트 합성 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
