# denyEnvelope — Contract

## Requirements

- 차단은 `permissionDecision: "deny"` + `permissionDecisionReason` 으로 신호한다. top-level `continue: false` 는 턴 전체를 중단시키고 reason 을 잃으므로 쓰지 않는다.
- 차단해도 `continue: true` 를 유지한다. 거부되는 것은 도구 호출 하나뿐이다.
- 관심사가 만든 `additionalContext`·`systemMessage` 를 그대로 보존한다.
- 번역 전용이다. 경로 판정 같은 관심사 로직을 여기 두지 않는다.

## API Contracts

- `toPreToolUseEnvelope(...)` — 병합된 관심사 결과를 Claude Code PreToolUse stdout 계약으로 번역한다.

## Acceptance Criteria

### AC-deny-keeps-continue — 차단 시 continue 유지

- 차단 결과에도 `continue: true` 가 남고 `permissionDecision: "deny"` 로 신호한다.

### AC-no-top-level-continue-false — top-level 중단 부재

- 어떤 입력에서도 top-level `continue: false` 나 `reason` 을 방출하지 않는다.

### AC-context-preserved — 컨텍스트 보존

- 관심사가 채운 `additionalContext`·`systemMessage` 가 결과에 남는다.

## Boundary Exemptions

### `denyEnvelope.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PreToolUse 진입점이 이 번역기를 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴 경유의 여유가 없다.

## Last Updated

2026-07-30 — deny 신호 계약과 훅 직접 import 면책을 문서화했다.
