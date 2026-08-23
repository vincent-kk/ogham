# postToolUse — Contract

## Requirements

- activity recorder는 maencof MCP mutation allowlist에만 실행하고 native tool은 기록하지 않는다.
- lifecycle dispatcher는 모든 PostToolUse에서 정확히 한 번 실행하며 raw physical `tool_name`을 Pre와 같은 shared matcher에 전달한다.
- 성공·실패 또는 문자열·객체 `tool_response` 형태는 lifecycle matcher 판정에 관여하지 않는다.
- 각 concern은 실패 격리 후 단일 PostToolUse envelope로 병합한다.

## API Contracts

- `orchestratePostToolUse(input: DispatchInput): MergedHookOutput` — activity allowlist gate와 shared lifecycle dispatch를 실행해 병합한다.

## Acceptance Criteria

### AC-native-not-recorded — native tool 비기록

- `Edit`, `apply_patch`, `Bash` 같은 native tool은 activity log에 기록하지 않는다.

### AC-shared-lifecycle-matcher — Pre/Post 공통 matcher

- Claude `Edit`와 Codex `apply_patch`가 같은 logical edit action을 각각 한 번 실행한다.
- 같은 tool name은 response 형태와 무관하게 같은 action 집합을 실행한다.

### AC-concern-isolated — concern 실패 격리

- recorder 또는 lifecycle 하나가 실패해도 다른 concern의 결과가 보존된다.

## Last Updated

2026-08-23 — raw physical tool을 공유 logical lifecycle matcher에 전달하는 Post 계약을 추가했다.
