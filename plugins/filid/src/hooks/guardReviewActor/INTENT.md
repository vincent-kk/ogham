# guardReviewActor — review actor capability guard

## Purpose

Claude Code의 plugin-wide PreToolUse 경계에서 review actor를 식별하고, broker의 context capability 외 도구 호출을 차단한다.

## Conventions

- `hooks/hooks.json`이 모든 PreToolUse에 진입점을 연결하고 `agent_type`이 적용 대상을 결정한다.
- `review-actor`와 host가 namespace를 보존한 `filid:review-actor`만 actor로 취급한다.
- actor가 아닌 호출과 actor의 허용된 context 호출은 permission 결정을 추가하지 않는다.

## Boundaries

### Always do

- exact tool name과 exact `action=context`를 함께 확인
- 차단할 때 현재 tool call만 `permissionDecision: deny`로 거부
- malformed entry payload는 전역 세션을 막지 않고 hook failure로 기록

### Ask first

- actor identity 또는 허용 capability 확대
- 전역 PreToolUse matcher 제거

### Never do

- cwd·transcript 경로·prompt 내용으로 actor를 추측
- review actor가 아닌 세션의 tool permission 결정
- plugin agent frontmatter의 unsupported `hooks` 필드에 의존
