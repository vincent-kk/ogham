# guardReviewActor contract

## Requirements

- Claude Code가 plugin subagent 호출에 제공하는 `agent_type`으로 review actor를 식별한다.
- plugin-shipped agent에서 무시되는 inline hook 대신 canonical plugin hook이 이 진입점을 호출한다.
- project FCA config는 bundle entry를 이 fractal의 scoped allowed peer로 등록한다.
- actor는 `mcp__plugin_filid_tools__review_state`의 `action=context`만 통과한다.
- actor가 아닌 호출에는 permission 결정을 추가하지 않는다.
- 파싱할 수 없는 전역 hook 입력은 일반 세션을 차단하지 않는다.

## API Contracts

- `guardReviewActor(input): HookOutput` — actor의 capability를 검사하고 per-tool deny 또는 무결정 통과를 반환한다.
- 허용과 비대상 결과는 `{ continue: true }`다.
- deny 결과는 `hookEventName: PreToolUse`와 고정된 비반사 사유를 포함한다.

## Acceptance Criteria

### AC-review-actor-identity — host identity 범위

- `review-actor`와 `filid:review-actor`에만 guard가 적용된다.
- 일반 main/subagent 호출은 같은 tool 입력이어도 통과한다.

### AC-review-actor-capability — broker 전용 접근

- exact review_state context 호출만 통과한다.
- filesystem, shell, search, delegation, foreign MCP와 다른 review_state action은 모두 deny한다.

## Boundary Exemptions

### guardReviewActor.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: hook entry가 root barrel을 거치면 다른 hook 구현이 번들에 포함되므로 entry와 검증이 단일 구현 파일을 직접 참조한다.

## Last Updated

2026-09-07 — plugin-wide actor identity guard를 도입했다.
