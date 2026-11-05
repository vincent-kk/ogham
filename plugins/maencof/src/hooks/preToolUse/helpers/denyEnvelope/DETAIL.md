# denyEnvelope — Contract

## Requirements

- 차단은 `permissionDecision: "deny"` + `permissionDecisionReason` 으로 신호한다. top-level `continue: false` 는 턴 전체를 중단시키고 reason 을 잃으므로 쓰지 않는다.
- 차단해도 `continue: true` 를 유지한다. 거부되는 것은 도구 호출 하나뿐이다.
- 관심사가 만든 `additionalContext`·`systemMessage` 를 그대로 보존한다.
- 번역 전용이다. 경로 판정 같은 관심사 로직을 여기 두지 않는다.

## API Contracts

도구 하나의 거부를 턴 전체 중단으로 바꾸지 않는다. stdout envelope의 구체적인 필드 보존은 구현과 테스트가 고정한다.

## Acceptance Criteria

행동별 결과와 경계값은 이 모듈을 검증하는 테스트가 고정한다.

## Boundary Exemptions

### `denyEnvelope.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PreToolUse 진입점이 이 번역기를 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴 경유의 여유가 없다.

## Last Updated

차단 신호 방식 또는 훅 직접 import 면책이 바뀔 때 갱신한다.
