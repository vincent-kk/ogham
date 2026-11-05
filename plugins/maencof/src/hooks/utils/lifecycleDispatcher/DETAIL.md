# lifecycleDispatcher — DETAIL

## Requirements

- vault lifecycle configuration의 `actions` 중 현재 이벤트·도구에 매칭되는 항목들을 실행하고, 결과 문자열을 하나로 합쳐 Claude Code 이벤트별 올바른 envelope 에 담아 반환한다.
- 매칭 액션이 없거나 vault 가 아닌 경우 `{ continue: true }` 만 반환해야 하며, `message` / `hookMessage` 같은 미지원 필드는 절대 방출하지 않는다.
- PreToolUse와 PostToolUse는 같은 host-neutral matcher 해석기를 사용한다. physical `apply_patch`만 logical `Edit`으로 정규화하고 `Edit`·`Bash`·MCP 이름 등 나머지는 그대로 비교한다.
- matcher 양쪽과 관측 tool 이름을 같은 방식으로 정규화한다. 판단은 `tool_name`에만 의존하며 성공·실패 `tool_response` 형태를 읽지 않는다.

## API Contracts

지원하지 않는 이벤트(Stop·SessionEnd 포함)는 조용히 통과해 남아 있는 사용자 설정이 세션을 막지 않게 한다. 모든 지원 이벤트의 메시지는 additionalContext 한 채널에 싣고 호스트가 버리는 top-level message·hookMessage는 내보내지 않는다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Boundary Exemptions

### `lifecycleDispatcher.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 네 훅 전부가 이 디스패처를 호출하므로 배럴을 거치면 네 번들 모두가 재노출 그래프를 함께 싣게 되고, `post-tool-use`·`pre-tool-use` 의 12288 바이트 캡이 먼저 깨진다.

## Last Updated

Pre/Post 공통 matcher 해석, 지원 이벤트 또는 additionalContext 전달 계약이 바뀔 때 갱신한다.
