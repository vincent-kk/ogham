# denyEnvelope

## Purpose

병합된 PreToolUse 관심사 결과를 Claude Code stdout 계약으로 번역. 차단은 `permissionDecision:"deny"` + `permissionDecisionReason`으로 신호한다 (`continue:false`는 턴 전체 중단 + reason 유실).

## Boundaries

### Always do

- 차단 시에도 `continue: true` 유지 (도구 호출만 거부)
- 관심사가 만든 `additionalContext`/`systemMessage` 보존

### Ask first

- `permissionDecision: "ask"` 승격 등 결정 정책 변경

### Never do

- top-level `continue:false`/`reason` 재도입
- 관심사 로직(경로 판정 등) 추가 — 번역 전용
