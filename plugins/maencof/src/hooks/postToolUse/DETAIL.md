# postToolUse — Contract

## Requirements

- activity recorder는 maencof MCP mutation allowlist에만 실행하고 native tool은 기록하지 않는다.
- lifecycle dispatcher는 모든 PostToolUse에서 정확히 한 번 실행하며 raw physical `tool_name`을 Pre와 같은 shared matcher에 전달한다.
- 성공·실패 또는 문자열·객체 `tool_response` 형태는 lifecycle matcher 판정에 관여하지 않는다.
- 각 concern은 실패 격리 후 단일 PostToolUse envelope로 병합한다.

## API Contracts

activity 기록과 lifecycle 판정은 서로 다른 게이트를 가진다. native tool 비기록 규칙이 lifecycle 실행까지 막지 않아야 한다.

## Acceptance Criteria

### AC-shared-lifecycle-matcher — Pre/Post 공통 matcher

- Claude `Edit`와 Codex `apply_patch`가 같은 logical edit action을 각각 한 번 실행한다.
- 같은 tool name은 response 형태와 무관하게 같은 action 집합을 실행한다.

## Last Updated

activity 기록 게이트, lifecycle 실행 횟수 또는 Pre와 공유하는 matcher 입력이 바뀔 때 갱신한다.
