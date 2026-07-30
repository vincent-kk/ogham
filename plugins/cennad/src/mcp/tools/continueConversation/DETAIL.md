# continueConversation — Contract

## Requirements

- cennad `session_id` 로 `SessionMeta` 를 찾아 dispatcher 의 resume 을 호출하고, `turn_count` 와 `last_used_at` 을 갱신한다.
- **`project_hash` 불일치는 fallback 검색 없이 `error.code='unknown'` 이다.** 다른 프로젝트의 세션을 찾아 이어주지 않는다.
- 세션이 기록한 tier 를 복원해 모델을 유지한다.

## API Contracts

- `handleContinueConversation(...)` — 기존 세션을 이어 호출하고 `ConversationResponse` 를 돌려준다.

## Acceptance Criteria

### AC-project-scope-strict — 스코프 엄격성

- 다른 `project_hash` 의 세션 요청이 오류로 끝나고 교차 검색이 일어나지 않는다.

### AC-turn-accounting — 턴 회계

- 성공 호출마다 `turn_count` 가 증가하고 `last_used_at` 이 갱신된다.

### AC-tier-restoration — tier 복원

- 세션이 시작된 tier 가 복원되어 모델이 턴 사이에 바뀌지 않는다.

## Last Updated

2026-07-30 — 세션 이어가기 도구 계약을 문서화했다.
